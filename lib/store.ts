import type { GameRoom } from "./types";

const globalForStore = globalThis as unknown as { __gameRooms?: Map<string, GameRoom> };
if (!globalForStore.__gameRooms) globalForStore.__gameRooms = new Map();
const memoryStore = globalForStore.__gameRooms;

const DATABASE_URL = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === "production" && !!DATABASE_URL;

let pool: any = null;

export async function getPool() {
  if (pool) return pool;
  if (!isProduction) return null;

  try {
    const { Pool } = await import("pg");
    const dbUrl = new URL(DATABASE_URL!);
    pool = new Pool({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || "5432"),
      database: dbUrl.pathname.slice(1) || "postgres",
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });

    const connectPromise = (async () => {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
    })();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Connection test timed out after 8s")), 8000)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    return pool;
  } catch (e) {
    console.error("PostgreSQL connection failed:", e);
    if (pool) { try { await pool.end(); } catch { /* ignore */ } }
    pool = null;
    return null;
  }
}

async function initializeDatabase() {
  if (!isProduction) return;
  try {
    const pgPool = await getPool();
    if (!pgPool) return;
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        code VARCHAR(6) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rooms_updated ON rooms(updated_at);
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(255),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating DESC, created_at DESC);
    `);
    await pgPool.query(`
      ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
    `);
    await pgPool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rooms' AND policyname = 'rooms_allow_all') THEN
          CREATE POLICY rooms_allow_all ON rooms FOR ALL USING (true) WITH CHECK (true);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'feedback_allow_all') THEN
          CREATE POLICY feedback_allow_all ON feedback FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `);
  } catch (e) {
    console.error("Database initialization failed:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateRoom(raw: any): GameRoom {
  if ("impostorId" in raw && !("impostorIds" in raw)) {
    raw.impostorIds = raw.impostorId ? [raw.impostorId] : [];
    delete raw.impostorId;
  }
  if (!("expectedPlayerCount" in raw)) raw.expectedPlayerCount = 20;
  if (!("impostorCount" in raw)) raw.impostorCount = 1;
  if (!("roundHistory" in raw)) raw.roundHistory = [];
  if (!("mode" in raw)) raw.mode = "online";
  if (!("gameStartedAt" in raw)) raw.gameStartedAt = null;
  if (!("notifications" in raw)) raw.notifications = [];
  if (Array.isArray(raw.players)) {
    for (const p of raw.players) {
      if (!("isSpectator" in p)) p.isSpectator = false;
      if (!("lastSeenAt" in p)) p.lastSeenAt = p.joinedAt || Date.now();
    }
  }
  return raw as GameRoom;
}

export async function getRoom(code: string): Promise<GameRoom | null> {
  try {
    if (isProduction) {
      const pgPool = await getPool();
      if (pgPool) {
        const result = await pgPool.query("SELECT data FROM rooms WHERE code = $1", [code]);
        if (result.rows.length > 0) return migrateRoom(result.rows[0].data);
        return null;
      }
    }
    const room = memoryStore.get(code) ?? null;
    return room ? migrateRoom(room) : null;
  } catch (e) {
    console.error("Error fetching room:", e);
    const room = memoryStore.get(code) ?? null;
    return room ? migrateRoom(room) : null;
  }
}

export async function setRoom(room: GameRoom): Promise<void> {
  try {
    if (isProduction) {
      const pgPool = await getPool();
      if (pgPool) {
        await pgPool.query(
          `INSERT INTO rooms (code, data, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (code) DO UPDATE SET data = $2, updated_at = NOW()`,
          [room.code, JSON.stringify(room)]
        );
        return;
      }
    }
    memoryStore.set(room.code, room);
  } catch (e) {
    console.error("Error saving room:", e);
    memoryStore.set(room.code, room);
  }
}

export async function deleteRoom(code: string): Promise<void> {
  try {
    if (isProduction) {
      const pgPool = await getPool();
      if (pgPool) {
        await pgPool.query("DELETE FROM rooms WHERE code = $1", [code]);
        return;
      }
    }
    memoryStore.delete(code);
  } catch (e) {
    console.error("Error deleting room:", e);
    memoryStore.delete(code);
  }
}

export interface FeedbackEntry {
  id: number;
  name: string | null;
  email: string | null;
  rating: number;
  feedback_text: string;
  created_at: string;
}

const globalForFeedback = globalThis as unknown as { __feedback?: FeedbackEntry[] };
if (!globalForFeedback.__feedback) globalForFeedback.__feedback = [];
const memoryFeedback = globalForFeedback.__feedback;

export async function submitFeedback(
  name: string | null, email: string | null, rating: number, feedbackText: string
): Promise<FeedbackEntry> {
  if (isProduction) {
    const pgPool = await getPool();
    if (pgPool) {
      const result = await pgPool.query(
        `INSERT INTO feedback (name, email, rating, feedback_text) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name || null, email || null, rating, feedbackText]
      );
      return result.rows[0];
    }
  }
  const entry: FeedbackEntry = {
    id: memoryFeedback.length + 1, name: name || null, email: email || null,
    rating, feedback_text: feedbackText, created_at: new Date().toISOString(),
  };
  memoryFeedback.push(entry);
  return entry;
}

export async function getFeedbackStats(): Promise<{
  average: number; totalCount: number; topFeedback: FeedbackEntry[];
}> {
  if (isProduction) {
    const pgPool = await getPool();
    if (pgPool) {
      const avgResult = await pgPool.query(`SELECT COALESCE(AVG(rating), 0) as average, COUNT(*) as total FROM feedback`);
      const topResult = await pgPool.query(`SELECT * FROM feedback ORDER BY rating DESC, created_at DESC LIMIT 5`);
      return {
        average: parseFloat(parseFloat(avgResult.rows[0].average).toFixed(1)),
        totalCount: parseInt(avgResult.rows[0].total),
        topFeedback: topResult.rows,
      };
    }
  }
  const total = memoryFeedback.length;
  const average = total > 0 ? parseFloat((memoryFeedback.reduce((s, f) => s + f.rating, 0) / total).toFixed(1)) : 0;
  const topFeedback = [...memoryFeedback].sort((a, b) => b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  return { average, totalCount: total, topFeedback };
}

initializeDatabase().catch(console.error);

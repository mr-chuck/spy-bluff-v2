import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";

// Test-only endpoint to simulate disconnects/inactivity without real waiting.
// Disabled unless ALLOW_TEST_HOOKS=1 (set by the test runner's dev server).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (process.env.ALLOW_TEST_HOOKS !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { code } = await params;
  const body = await req.json();

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const now = Date.now();
  if (typeof body.lastActivityMsAgo === "number") {
    room.lastActivity = now - body.lastActivityMsAgo;
  }
  if (body.playerLastSeenMsAgo && typeof body.playerLastSeenMsAgo === "object") {
    for (const [playerId, msAgo] of Object.entries(body.playerLastSeenMsAgo)) {
      if (typeof msAgo !== "number") continue;
      const player = room.players.find((p) => p.id === playerId);
      if (player) player.lastSeenAt = now - msAgo;
    }
  }

  await setRoom(room);
  return NextResponse.json({ success: true });
}

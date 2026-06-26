// Spy Bluff v2 - API-level test suite
//
// Usage:
//   ALLOW_TEST_HOOKS=1 npx next dev -p 3100   (in one terminal)
//   node tests/run-tests.mjs                  (in another terminal)
//
// Optional: set BASE_URL to point at a different server (default http://localhost:3100)

const BASE = process.env.BASE_URL || "http://localhost:3100";

// ---------- low level HTTP ----------

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  return { status: res.status, ok: res.ok, data };
}

const createRoom = (name, opts = {}) => api("POST", "/api/room/create", { name, ...opts });
const joinRoom = (code, name) => api("POST", `/api/room/${code}/join`, { name });
const startGame = (code, playerId) => api("POST", `/api/room/${code}/start`, { playerId });
const getState = (code, playerId) => api("GET", `/api/room/${code}?playerId=${playerId}`);
const submitClue = (code, playerId, clue) => api("POST", `/api/room/${code}/clue`, { playerId, clue });
const castVote = (code, playerId, targetId) => api("POST", `/api/room/${code}/vote`, { playerId, targetId });
const nextRound = (code, playerId) => api("POST", `/api/room/${code}/next-round`, { playerId });
const continueRound = (code, playerId) => api("POST", `/api/room/${code}/continue-round`, { playerId });
const backToLobby = (code, playerId) => api("POST", `/api/room/${code}/back-to-lobby`, { playerId });
const leaveRoom = (code, playerId) => api("POST", `/api/room/${code}/leave`, { playerId });
const endGame = (code, playerId) => api("POST", `/api/room/${code}/end-game`, { playerId });
const timewarp = (code, body) => api("POST", `/api/room/${code}/test-timewarp`, body);

// ---------- assertion helpers ----------

class AssertionError extends Error {}

function assert(cond, msg) {
  if (!cond) throw new AssertionError(msg);
}

function assertEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new AssertionError(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ---------- game helpers ----------

async function setupRoom(n, impostorCount, opts = {}) {
  const cr = await createRoom("Host", { expectedPlayerCount: n, impostorCount, ...opts });
  assert(cr.ok, `create failed: ${JSON.stringify(cr.data)}`);
  const code = cr.data.code;
  const players = [{ id: cr.data.playerId, name: "Host" }];
  for (let i = 2; i <= n; i++) {
    const jr = await joinRoom(code, `P${i}`);
    assert(jr.ok, `join failed for P${i}: ${JSON.stringify(jr.data)}`);
    players.push({ id: jr.data.playerId, name: `P${i}` });
  }
  return { code, players, hostId: players[0].id };
}

async function start(code, hostId) {
  const r = await startGame(code, hostId);
  assert(r.ok, `start failed: ${JSON.stringify(r.data)}`);
  return r;
}

async function getRoles(code, players) {
  const roles = {};
  for (const p of players) {
    const s = await getState(code, p.id);
    assert(s.ok, `getState failed for ${p.name}: ${JSON.stringify(s.data)}`);
    roles[p.id] = s.data.myRole;
  }
  return roles;
}

// Submit clues in turn order until the room leaves "playing" status.
async function playClues(code, hostId) {
  for (let guard = 0; guard < 50; guard++) {
    const s = await getState(code, hostId);
    if (s.data.status !== "playing") return s.data;
    const currentId = s.data.turnOrder[s.data.currentTurnIndex];
    const r = await submitClue(code, currentId, "clue");
    assert(r.ok, `clue failed for ${currentId}: ${JSON.stringify(r.data)}`);
  }
  throw new AssertionError("playClues: too many iterations, stuck in playing phase");
}

// Replicates lib/game-logic.ts tallyVotesAndCheckWin for prediction/verification.
function predictTally(alive, votes) {
  const tally = {};
  for (const p of alive) {
    const v = votes[p.id];
    if (v && v !== "abstain") tally[v] = (tally[v] ?? 0) + 1;
  }
  let eliminated = null;
  const maxVotes = Math.max(0, ...Object.values(tally));
  if (maxVotes > 0) {
    const top = Object.entries(tally).filter(([, v]) => v === maxVotes).map(([id]) => id);
    if (top.length === 1) eliminated = top[0];
  }
  return { tally, eliminated };
}

function predictWinner(alive, impostorIds, eliminated) {
  const remaining = alive.filter((p) => p.id !== eliminated);
  const aliveImpostors = remaining.filter((p) => impostorIds.includes(p.id));
  const aliveVillagers = remaining.filter((p) => !impostorIds.includes(p.id));
  if (aliveImpostors.length === 0) return "crew";
  if (aliveImpostors.length >= aliveVillagers.length) return "impostor";
  return null;
}

// Cast votes for all alive players using a per-player target function.
// targetFn(player, alive) => targetId | "abstain"
async function castVotesPattern(code, alive, targetFn) {
  const votes = {};
  for (const p of alive) {
    const target = targetFn(p, alive);
    votes[p.id] = target;
    const r = await castVote(code, p.id, target);
    assert(r.ok, `vote failed for ${p.id} -> ${target}: ${JSON.stringify(r.data)}`);
  }
  return votes;
}

// ---------- test runner ----------

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`PASS  ${name}`);
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.log(`FAIL  ${name}\n      ${e.message}`);
  }
}

// =========================================================================
// A. Player/impostor count matrix - full round playthrough
// =========================================================================

const MATRIX = [
  [3, 1], [4, 1], [5, 1], [6, 1], [6, 2], [7, 2],
  [9, 3], [10, 2], [12, 4], [15, 3], [18, 6], [20, 6],
];

for (const [n, imp] of MATRIX) {
  await test(`matrix n=${n} impostors=${imp}: full round`, async () => {
    const { code, players, hostId } = await setupRoom(n, imp);
    await start(code, hostId);

    const roles = await getRoles(code, players);
    const impostorIds = players.filter((p) => roles[p.id] === "impostor").map((p) => p.id);
    assertEqual(impostorIds.length, imp, "impostor count mismatch");

    await playClues(code, hostId);

    let s = await getState(code, hostId);
    assertEqual(s.data.status, "voting", "should be in voting phase after clues");
    const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);

    // Everyone votes to eliminate one impostor (or the only remaining target).
    const target = impostorIds[0];
    const votes = await castVotesPattern(code, alive, (p) =>
      p.id === target ? alive.find((a) => a.id !== target).id : target
    );

    const { tally, eliminated } = predictTally(alive, votes);
    const expectedWinner = predictWinner(alive, impostorIds, eliminated);

    s = await getState(code, hostId);
    assertEqual(s.data.status, "results", "should be in results phase");
    assertEqual(s.data.voteResult.eliminated, eliminated, "eliminated mismatch");
    assertEqual(s.data.voteResult.tally, tally, "tally mismatch");
    assertEqual(s.data.winner, expectedWinner, "winner mismatch");
  });
}

// =========================================================================
// B. Create-time clamping
// =========================================================================

await test("clamp: expectedPlayerCount below 3 clamps to 3", async () => {
  const { code, hostId } = await setupRoom(3, 1, { expectedPlayerCount: 2 });
  const s = await getState(code, hostId);
  assertEqual(s.data.expectedPlayerCount, 3, "expectedPlayerCount");
});

await test("clamp: expectedPlayerCount above 20 clamps to 20", async () => {
  const cr = await createRoom("Host", { expectedPlayerCount: 25, impostorCount: 1 });
  assert(cr.ok, JSON.stringify(cr.data));
  const s = await getState(cr.data.code, cr.data.playerId);
  assertEqual(s.data.expectedPlayerCount, 20, "expectedPlayerCount");
});

await test("clamp: impostorCount below 1 clamps to 1", async () => {
  const cr = await createRoom("Host", { expectedPlayerCount: 3, impostorCount: 0 });
  assert(cr.ok, JSON.stringify(cr.data));
  const s = await getState(cr.data.code, cr.data.playerId);
  assertEqual(s.data.impostorCount, 1, "impostorCount");
});

await test("clamp: impostorCount above max (small room) clamps to floor(n/3)", async () => {
  const cr = await createRoom("Host", { expectedPlayerCount: 4, impostorCount: 5 });
  assert(cr.ok, JSON.stringify(cr.data));
  const s = await getState(cr.data.code, cr.data.playerId);
  assertEqual(s.data.impostorCount, 1, "impostorCount"); // floor(4/3)=1
});

await test("clamp: impostorCount above max (large room) clamps to floor(n/3)", async () => {
  const cr = await createRoom("Host", { expectedPlayerCount: 20, impostorCount: 10 });
  assert(cr.ok, JSON.stringify(cr.data));
  const s = await getState(cr.data.code, cr.data.playerId);
  assertEqual(s.data.impostorCount, 6, "impostorCount"); // floor(20/3)=6
});

// =========================================================================
// C. Offline mode
// =========================================================================

await test("offline mode: role visibility (n=4, impostors=1)", async () => {
  const { code, players, hostId } = await setupRoom(4, 1, { mode: "offline" });
  await start(code, hostId);

  for (const p of players) {
    const s = await getState(code, p.id);
    assertEqual(s.data.mode, "offline", "mode");
    if (s.data.myRole === "impostor") {
      assert(s.data.secretWord === null, "impostor should not see secretWord");
      assert(typeof s.data.wordHint === "string" && s.data.wordHint.length > 0, "impostor should see wordHint");
    } else {
      assert(typeof s.data.secretWord === "string" && s.data.secretWord.length > 0, "villager should see secretWord");
      assert(s.data.wordHint === null, "villager should not see wordHint");
    }
    assertEqual(s.data.impostorIds, [], "impostorIds hidden during active game");
  }

  const r = await endGame(code, hostId);
  assert(r.ok, JSON.stringify(r.data));
  const s = await getState(code, hostId);
  assertEqual(s.data.status, "results", "status after end-game");
  assertEqual(s.data.impostorIds.length, 1, "impostorIds revealed after offline results");
  assert(typeof s.data.secretWord === "string", "secretWord revealed after offline results");
});

await test("offline mode: n=6 impostors=2 starts cleanly", async () => {
  const { code, players, hostId } = await setupRoom(6, 2, { mode: "offline" });
  await start(code, hostId);
  const roles = await getRoles(code, players);
  const impCount = Object.values(roles).filter((r) => r === "impostor").length;
  assertEqual(impCount, 2, "impostor count");
});

// =========================================================================
// D. Vote/clue validation errors
// =========================================================================

await test("vote: cannot vote for yourself", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId);
  const r = await castVote(code, players[0].id, players[0].id);
  assertEqual(r.status, 400, "status");
});

await test("vote: rejected outside voting phase", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  // Still in "playing" phase
  const r = await castVote(code, players[0].id, players[1].id);
  assertEqual(r.status, 400, "status");
});

await test("vote: invalid target rejected", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId);
  const r = await castVote(code, players[0].id, "nonexistent-id");
  assertEqual(r.status, 400, "status");
});

await test("vote: double voting rejected", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId);
  const first = await castVote(code, players[0].id, players[1].id);
  assert(first.ok, JSON.stringify(first.data));
  const second = await castVote(code, players[0].id, players[1].id);
  assertEqual(second.status, 400, "status");
});

await test("clue: out-of-turn rejected", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  const s = await getState(code, hostId);
  const currentId = s.data.turnOrder[s.data.currentTurnIndex];
  const wrongPlayer = players.find((p) => p.id !== currentId);
  const r = await submitClue(code, wrongPlayer.id, "clue");
  assertEqual(r.status, 403, "status");
});

await test("clue: empty clue rejected", async () => {
  const { code, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  const s = await getState(code, hostId);
  const currentId = s.data.turnOrder[s.data.currentTurnIndex];
  const r = await submitClue(code, currentId, "   ");
  assertEqual(r.status, 400, "status");
});

await test("clue: rejected outside playing phase", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId); // now voting
  const r = await submitClue(code, players[0].id, "clue");
  assertEqual(r.status, 400, "status");
});

// =========================================================================
// E. Voting outcome variants
// =========================================================================

await test("voting: tie results in no elimination, game continues", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId);
  const s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  const [a, b, c, d] = alive;
  // a->b, b->a, c->a, d->b => a:2, b:2 tie
  await castVote(code, a.id, b.id);
  await castVote(code, b.id, a.id);
  await castVote(code, c.id, a.id);
  const final = await castVote(code, d.id, b.id);
  assert(final.ok, JSON.stringify(final.data));

  const fs = await getState(code, hostId);
  assertEqual(fs.data.status, "results", "status");
  assertEqual(fs.data.voteResult.eliminated, null, "eliminated");
  assertEqual(fs.data.winner, null, "winner");
});

await test("voting: all abstain -> no elimination", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId);
  const s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  await castVotesPattern(code, alive, () => "abstain");

  const fs = await getState(code, hostId);
  assertEqual(fs.data.voteResult.eliminated, null, "eliminated");
  assertEqual(fs.data.winner, null, "winner");
  assert(fs.data.winReason.includes("abstain") || fs.data.winReason.includes("tie"), "winReason text");
});

// =========================================================================
// F. Round history / archive
// =========================================================================

await test("archive: round snapshot recorded after results, sanitized while active", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  let s = await getState(code, hostId);
  const round1Word = s.data.secretWord ?? null; // host may be villager

  const roles = await getRoles(code, players);
  const impostorId = players.find((p) => roles[p.id] === "impostor").id;

  await playClues(code, hostId);
  s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  await castVotesPattern(code, alive, (p) =>
    p.id === impostorId ? alive.find((a) => a.id !== impostorId).id : impostorId
  );

  s = await getState(code, hostId);
  assertEqual(s.data.status, "results", "status");
  assertEqual(s.data.roundHistory.length, 1, "roundHistory length");
  assertEqual(s.data.roundHistory[0].roundNumber, 1, "roundNumber");
  assertEqual(s.data.roundHistory[0].impostorIds, [impostorId], "snapshot impostorIds revealed at results");
  assert(Object.keys(s.data.roundHistory[0].playerClues).length === alive.length, "playerClues recorded for all alive players");

  // Start round 2: history of round 1 should now be sanitized (active game)
  const nr = await nextRound(code, hostId);
  assert(nr.ok, JSON.stringify(nr.data));
  s = await getState(code, hostId);
  assertEqual(s.data.status, "playing", "status round2");
  assertEqual(s.data.round, 2, "round number");
  assertEqual(s.data.roundHistory[0].impostorIds, [], "round1 history sanitized during active round2");
  void round1Word;
});

await test("archive: multi-round history accumulates correctly", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  for (let round = 1; round <= 3; round++) {
    const roles = await getRoles(code, players);
    const impostorId = players.find((p) => roles[p.id] === "impostor").id;
    await playClues(code, hostId);
    let s = await getState(code, hostId);
    const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
    await castVotesPattern(code, alive, (p) =>
      p.id === impostorId ? alive.find((a) => a.id !== impostorId).id : impostorId
    );
    s = await getState(code, hostId);
    assertEqual(s.data.roundHistory.length, round, `roundHistory length after round ${round}`);
    assertEqual(s.data.roundHistory[round - 1].roundNumber, round, "roundNumber");

    if (round < 3) {
      const nr = await nextRound(code, hostId);
      assert(nr.ok, JSON.stringify(nr.data));
    }
  }
});

// =========================================================================
// G. Impostor rotation
// =========================================================================

await test("rotation: impostor varies across rounds, host never impostor (n=6)", async () => {
  const { code, players, hostId } = await setupRoom(6, 1);
  await start(code, hostId);

  const impostorsSeen = new Set();
  for (let round = 1; round <= 8; round++) {
    const roles = await getRoles(code, players);
    const impostorId = players.find((p) => roles[p.id] === "impostor").id;
    impostorsSeen.add(impostorId);
    assert(impostorId !== hostId, `host should never be impostor (round ${round})`);

    await playClues(code, hostId);
    let s = await getState(code, hostId);
    const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
    // Always vote to keep continuing: abstain so game stays in "results" with winner=null, then next-round.
    await castVotesPattern(code, alive, () => "abstain");

    if (round < 8) {
      const nr = await nextRound(code, hostId);
      assert(nr.ok, JSON.stringify(nr.data));
    }
  }

  assert(impostorsSeen.size > 1, `expected impostor rotation, only saw: ${[...impostorsSeen]}`);
});

// =========================================================================
// H. New game / same players / back-to-lobby / continue-round
// =========================================================================

await test("new game: back-to-lobby resets state, round persists, can start again", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);
  await playClues(code, hostId);
  let s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  await castVotesPattern(code, alive, () => "abstain");

  s = await getState(code, hostId);
  const roundAfterGame1 = s.data.round;

  const btl = await backToLobby(code, hostId);
  assert(btl.ok, JSON.stringify(btl.data));
  s = await getState(code, hostId);
  assertEqual(s.data.status, "lobby", "status");
  assertEqual(s.data.impostorIds, [], "impostorIds reset");
  assertEqual(s.data.secretWord, null, "secretWord reset");
  assertEqual(s.data.round, roundAfterGame1, "round persists across back-to-lobby");

  const r2 = await start(code, hostId);
  assert(r2.ok, JSON.stringify(r2.data));
  s = await getState(code, hostId);
  assertEqual(s.data.status, "playing", "status after restart");
  assertEqual(s.data.round, roundAfterGame1 + 1, "round increments on restart");

  void players;
});

await test("new game: same players can play two full games, history accumulates", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);

  for (let game = 1; game <= 2; game++) {
    await start(code, hostId);
    await playClues(code, hostId);
    let s = await getState(code, hostId);
    const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
    await castVotesPattern(code, alive, () => "abstain");

    s = await getState(code, hostId);
    assertEqual(s.data.roundHistory.length, game, `roundHistory length after game ${game}`);

    if (game === 1) {
      const btl = await backToLobby(code, hostId);
      assert(btl.ok, JSON.stringify(btl.data));
    }
  }

  void players;
});

await test("continue-round: keeps same word, resets votes/turns", async () => {
  const { code, players, hostId } = await setupRoom(4, 1);
  await start(code, hostId);

  // Find a villager to read the word from (host might be impostor).
  const roles = await getRoles(code, players);
  const villager = players.find((p) => roles[p.id] === "villager");

  await playClues(code, hostId);
  let s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  await castVotesPattern(code, alive, () => "abstain");

  let vs = await getState(code, villager.id);
  const wordBefore = vs.data.secretWord;
  assert(typeof wordBefore === "string", "word visible after results");

  const cr = await continueRound(code, hostId);
  assert(cr.ok, JSON.stringify(cr.data));

  s = await getState(code, hostId);
  assertEqual(s.data.status, "playing", "status");
  assertEqual(s.data.round, 2, "round incremented");

  vs = await getState(code, villager.id);
  assertEqual(vs.data.secretWord, wordBefore, "word unchanged after continue-round");
});

// =========================================================================
// I. Player dropout mid-game
// =========================================================================

await test("dropout: player leaves before their turn, turn order shrinks", async () => {
  const { code, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  let s = await getState(code, hostId);
  // Pick a non-host player whose turn hasn't come yet (index > currentTurnIndex).
  const upcomingId = s.data.turnOrder
    .slice(s.data.currentTurnIndex + 1)
    .find((id) => id !== hostId);
  assert(upcomingId, "test setup: found a non-host upcoming player");

  const lr = await leaveRoom(code, upcomingId);
  assert(lr.ok, JSON.stringify(lr.data));

  s = await getState(code, hostId);
  assertEqual(s.data.turnOrder.includes(upcomingId), false, "left player removed from turnOrder");
  assertEqual(s.data.status, "playing", "game continues");

  // Finish the round with remaining players.
  await playClues(code, hostId);
  s = await getState(code, hostId);
  assertEqual(s.data.status, "voting", "moves to voting");
  const alivePlayers = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  assertEqual(alivePlayers.length, 4, "4 players remain alive");
});

await test("dropout: leave during voting auto-tallies when remaining all voted", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);
  await playClues(code, hostId);

  let s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  const leaver = alive[alive.length - 1];
  const voters = alive.filter((p) => p.id !== leaver.id);

  await castVotesPattern(code, voters, () => "abstain");

  s = await getState(code, hostId);
  assertEqual(s.data.status, "voting", "still voting before leaver leaves");

  const lr = await leaveRoom(code, leaver.id);
  assert(lr.ok, JSON.stringify(lr.data));

  s = await getState(code, hostId);
  assertEqual(s.data.status, "results", "auto-tallied after leaver departs");
  assertEqual(s.data.winner, null, "winner (all abstained)");
});

await test("dropout: leaving below min players ends the game", async () => {
  const { code, players, hostId } = await setupRoom(3, 1); // minPlayers = impostorCount+2 = 3
  await start(code, hostId);

  const nonHost = players.find((p) => p.id !== hostId);
  const lr = await leaveRoom(code, nonHost.id);
  assert(lr.ok, JSON.stringify(lr.data));

  const s = await getState(code, hostId);
  assertEqual(s.data.status, "results", "status");
  assertEqual(s.data.winner, null, "winner");
  assert(s.data.winReason.includes("not enough players"), `winReason: ${s.data.winReason}`);
});

await test("dropout: host leaving mid-game transfers host", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  const lr = await leaveRoom(code, hostId);
  assert(lr.ok, JSON.stringify(lr.data));

  const remaining = players.find((p) => p.id !== hostId);
  const s = await getState(code, remaining.id);
  const hosts = s.data.players.filter((p) => p.isHost);
  assertEqual(hosts.length, 1, "exactly one host remains");
  assert(hosts[0].id !== hostId, "host transferred away from departed player");
});

await test("dropout: all but one leaving deletes the room", async () => {
  const { code, players, hostId } = await setupRoom(3, 1);
  await start(code, hostId);

  for (const p of players.slice(1)) {
    await leaveRoom(code, p.id);
  }
  // After 2nd leave, min players check should have already ended the game (results, n=1 alive).
  // Leaving the last alive player should delete the room.
  await leaveRoom(code, hostId);

  const s = await getState(code, hostId);
  assertEqual(s.status, 404, "room should be deleted");
});

// =========================================================================
// J. New player joins mid-game (spectator)
// =========================================================================

await test("spectator: player joining mid-game becomes spectator, included next round", async () => {
  const { code, players, hostId } = await setupRoom(4, 1, { expectedPlayerCount: 5 });
  await start(code, hostId);

  const jr = await joinRoom(code, "Latecomer");
  assert(jr.ok, JSON.stringify(jr.data));
  const latecomerId = jr.data.playerId;

  let s = await getState(code, latecomerId);
  assertEqual(s.data.myRole, null, "spectator has no role");
  const me = s.data.players.find((p) => p.id === latecomerId);
  assert(me.isSpectator, "joined as spectator");
  assert(me.isAlive, "spectator marked alive");

  await playClues(code, hostId);
  s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  await castVotesPattern(code, alive, () => "abstain");

  const nr = await nextRound(code, hostId);
  assert(nr.ok, JSON.stringify(nr.data));

  s = await getState(code, hostId);
  const latecomer = s.data.players.find((p) => p.id === latecomerId);
  assert(!latecomer.isSpectator, "latecomer becomes active player next round");
  assert(s.data.turnOrder.includes(latecomerId), "latecomer included in turn order");

  void players;
});

// =========================================================================
// K. Disconnect / browser closed / inactivity timeout
// =========================================================================

await test("disconnect: host going silent transfers host to another player", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  const tw = await timewarp(code, { playerLastSeenMsAgo: { [hostId]: 20_000 } });
  assert(tw.ok, JSON.stringify(tw.data));

  // Poll as a different player (polling as the host would refresh its own lastSeenAt).
  const other = players.find((p) => p.id !== hostId);
  const s = await getState(code, other.id);
  const hosts = s.data.players.filter((p) => p.isHost);
  assertEqual(hosts.length, 1, "exactly one host remains");
  assert(hosts[0].id !== hostId, "host transferred away from disconnected player");
  const oldHost = s.data.players.find((p) => p.id === hostId);
  assertEqual(oldHost.isAlive, false, "old host marked disconnected");
  assertEqual(oldHost.isHost, false, "old host no longer host");
});

await test("disconnect: silent player marked disconnected after threshold (upcoming turn)", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  let s = await getState(code, hostId);
  const currentId = s.data.turnOrder[s.data.currentTurnIndex];
  // Pick someone whose turn is later (not current, not host if possible) to go silent.
  const silentId = s.data.turnOrder.find((id) => id !== currentId);
  assert(silentId, "found a non-current player");

  const tw = await timewarp(code, { playerLastSeenMsAgo: { [silentId]: 20_000 } });
  assert(tw.ok, JSON.stringify(tw.data));

  // Any poll (by another player) should detect and remove the disconnected player.
  s = await getState(code, hostId);
  const silentPlayer = s.data.players.find((p) => p.id === silentId);
  assertEqual(silentPlayer.isAlive, false, "disconnected player marked not alive");
  assertEqual(s.data.turnOrder.includes(silentId), false, "removed from turn order");
  assert(s.data.notifications.some((n) => n.message.includes("disconnected")), "disconnect notification present");

  void players;
});

await test("disconnect: silent current-turn player ends round, moves to voting", async () => {
  const { code, players, hostId } = await setupRoom(3, 1); // smallest room: every disconnect matters
  await start(code, hostId);

  let s = await getState(code, hostId);
  // Have everyone except the last-in-turn-order submit a clue, leaving the last player's turn current.
  while (true) {
    s = await getState(code, hostId);
    if (s.data.currentTurnIndex === s.data.turnOrder.length - 1) break;
    const currentId = s.data.turnOrder[s.data.currentTurnIndex];
    const r = await submitClue(code, currentId, "clue");
    assert(r.ok, JSON.stringify(r.data));
  }

  const lastId = s.data.turnOrder[s.data.turnOrder.length - 1];
  const tw = await timewarp(code, { playerLastSeenMsAgo: { [lastId]: 20_000 } });
  assert(tw.ok, JSON.stringify(tw.data));

  // Poll as someone other than the silent player (polling as them would refresh their lastSeenAt).
  const poller = players.find((p) => p.id !== lastId);
  s = await getState(code, poller.id);
  // With n=3, impostorCount=1, minPlayers=3 -> losing one player ends the game ("not enough players")
  assertEqual(s.data.status, "results", "status after disconnect of last player");
  assert(s.data.winReason.includes("not enough players"), `winReason: ${s.data.winReason}`);
});

await test("disconnect: causes auto-tally during voting when remaining all voted", async () => {
  const { code, players, hostId } = await setupRoom(5, 1);
  await start(code, hostId);

  const roles = await getRoles(code, players);
  await playClues(code, hostId);

  let s = await getState(code, hostId);
  const alive = s.data.players.filter((p) => p.isAlive && !p.isSpectator);
  // Pick a villager to go silent, so the disconnect itself doesn't end the game
  // (if the lone impostor disconnects, "crew" auto-wins independent of the votes).
  const silent = alive.find((p) => roles[p.id] !== "impostor");
  const voters = alive.filter((p) => p.id !== silent.id);

  await castVotesPattern(code, voters, () => "abstain");

  const tw = await timewarp(code, { playerLastSeenMsAgo: { [silent.id]: 20_000 } });
  assert(tw.ok, JSON.stringify(tw.data));

  // Poll as someone other than the silent player.
  const poller = voters[0];
  s = await getState(code, poller.id);
  assertEqual(s.data.status, "results", "auto-tallied after disconnect");
  assertEqual(s.data.winner, null, "winner (all remaining abstained)");
});

await test("inactivity: game ends after 20min of inactivity", async () => {
  const { code, hostId } = await setupRoom(4, 1);
  await start(code, hostId);

  const tw = await timewarp(code, { lastActivityMsAgo: 21 * 60 * 1000 });
  assert(tw.ok, JSON.stringify(tw.data));

  const s = await getState(code, hostId);
  assertEqual(s.data.status, "results", "status");
  assertEqual(s.data.winner, null, "winner");
  assert(s.data.winReason.includes("inactivity"), `winReason: ${s.data.winReason}`);
});

await test("inactivity: not triggered before 20min", async () => {
  const { code, hostId } = await setupRoom(4, 1);
  await start(code, hostId);

  const tw = await timewarp(code, { lastActivityMsAgo: 19 * 60 * 1000 });
  assert(tw.ok, JSON.stringify(tw.data));

  const s = await getState(code, hostId);
  assertEqual(s.data.status, "playing", "status should be unaffected");
});

// =========================================================================
// L. Misc edge cases
// =========================================================================

await test("misc: joining a non-existent room returns 404", async () => {
  const r = await joinRoom("ZZZZZZ", "Nobody");
  assertEqual(r.status, 404, "status");
});

await test("misc: non-host cannot start the game", async () => {
  const { code, players } = await setupRoom(4, 1);
  const nonHost = players[1]; // setupRoom always makes players[0] the host
  const r = await startGame(code, nonHost.id);
  assertEqual(r.status, 403, "status");
});

await test("misc: starting with fewer players than minimum fails", async () => {
  const cr = await createRoom("Host", { expectedPlayerCount: 6, impostorCount: 2 });
  assert(cr.ok, JSON.stringify(cr.data));
  // Only host + 1 joined => 2 players, but minPlayers = impostorCount+2 = 4
  await joinRoom(cr.data.code, "P2");
  const r = await startGame(cr.data.code, cr.data.playerId);
  assertEqual(r.status, 400, "status");
});

await test("misc: joining a full room returns 400", async () => {
  const { code } = await setupRoom(3, 1, { expectedPlayerCount: 3 });
  const r = await joinRoom(code, "Overflow");
  assertEqual(r.status, 400, "status");
});

await test("misc: duplicate name rejected", async () => {
  const { code } = await setupRoom(4, 1);
  const r = await joinRoom(code, "Host"); // host's name
  assertEqual(r.status, 400, "status");
});

// =========================================================================
// Summary
// =========================================================================

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${passed}/${results.length} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\nFailures:");
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  - ${r.name}: ${r.error}`);
  }
  process.exit(1);
}

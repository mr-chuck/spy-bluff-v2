import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId } = await req.json();

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const host = room.players.find((p) => p.id === playerId);
  if (!host?.isHost) {
    return NextResponse.json({ error: "Only the host can continue" }, { status: 403 });
  }

  const alivePlayers = room.players.filter((p) => p.isAlive && !p.isSpectator);
  const turnOrder = shuffle(alivePlayers.map((p) => p.id));

  room.players = room.players.map((p) => ({ ...p, clue: null, hasVoted: false, vote: null }));
  room.status = "playing";
  room.round += 1;
  room.currentTurnIndex = 0;
  room.turnOrder = turnOrder;
  room.voteResult = null;
  room.winner = null;
  room.winReason = null;
  room.lastActivity = Date.now();

  await setRoom(room);
  return NextResponse.json({ success: true });
}

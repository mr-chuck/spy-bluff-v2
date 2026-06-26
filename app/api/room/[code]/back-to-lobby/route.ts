import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";

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
    return NextResponse.json({ error: "Only the host can return to lobby" }, { status: 403 });
  }

  room.players = room.players.map((p) => ({
    ...p, isAlive: true, isSpectator: false, clue: null, hasVoted: false, vote: null,
  }));
  room.status = "lobby";
  room.impostorIds = [];
  room.secretWord = null;
  room.wordHint = null;
  room.wordCategory = null;
  room.currentTurnIndex = 0;
  room.turnOrder = [];
  room.voteResult = null;
  room.winner = null;
  room.winReason = null;
  room.gameStartedAt = null;
  room.lastActivity = Date.now();

  await setRoom(room);
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";
import { tallyVotesAndCheckWin, saveRoundSnapshot } from "@/lib/game-logic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, targetId } = await req.json();

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "voting") {
    return NextResponse.json({ error: "Not in voting phase" }, { status: 400 });
  }

  const voter = room.players.find((p) => p.id === playerId);
  if (!voter || !voter.isAlive || voter.isSpectator) {
    return NextResponse.json({ error: "Cannot vote" }, { status: 403 });
  }
  if (voter.hasVoted) {
    return NextResponse.json({ error: "Already voted" }, { status: 400 });
  }

  if (targetId !== "abstain") {
    const target = room.players.find((p) => p.id === targetId);
    if (!target || !target.isAlive || target.isSpectator) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }
    if (targetId === playerId) {
      return NextResponse.json({ error: "Cannot vote for yourself" }, { status: 400 });
    }
  }

  room.players = room.players.map((p) =>
    p.id === playerId ? { ...p, hasVoted: true, vote: targetId } : p
  );
  room.lastActivity = Date.now();

  const alivePlayers = room.players.filter((p) => p.isAlive && !p.isSpectator);
  const allVoted = alivePlayers.every((p) => p.hasVoted);

  if (allVoted) {
    tallyVotesAndCheckWin(room);
    saveRoundSnapshot(room);
  }

  await setRoom(room);
  return NextResponse.json({ success: true });
}

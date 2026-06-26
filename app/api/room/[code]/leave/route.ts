import { NextResponse } from "next/server";
import { getRoom, setRoom, deleteRoom } from "@/lib/store";
import { checkMinPlayers, tallyVotesAndCheckWin, saveRoundSnapshot, reassignHostIfNeeded } from "@/lib/game-logic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId } = await req.json();

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const wasHost = player.isHost;
  const isActiveGame = room.status === "playing" || room.status === "voting";

  if (isActiveGame) {
    room.players = room.players.map((p) =>
      p.id === playerId ? { ...p, isAlive: false } : p
    );
    room.notifications.push({
      message: `${player.name} left the game.`, timestamp: Date.now(),
    });

    const indexInTurnOrder = room.turnOrder.indexOf(playerId);
    room.turnOrder = room.turnOrder.filter((id) => id !== playerId);

    if (room.status === "playing") {
      if (indexInTurnOrder !== -1 && indexInTurnOrder < room.currentTurnIndex) {
        room.currentTurnIndex = Math.max(0, room.currentTurnIndex - 1);
      }
      if (room.currentTurnIndex >= room.turnOrder.length && room.turnOrder.length > 0) {
        room.status = "voting";
      }
    }

    if (!checkMinPlayers(room) && room.status === "voting") {
      const alive = room.players.filter((p) => p.isAlive && !p.isSpectator);
      const allVoted = alive.length > 0 && alive.every((p) => p.hasVoted);
      if (allVoted) { tallyVotesAndCheckWin(room); saveRoundSnapshot(room); }
    }
  } else {
    room.players = room.players.filter((p) => p.id !== playerId);
  }

  reassignHostIfNeeded(room, playerId, wasHost);

  if (room.players.length === 0 || room.players.filter((p) => p.isAlive).length === 0) {
    await deleteRoom(room.code);
  } else {
    room.lastActivity = Date.now();
    await setRoom(room);
  }

  return NextResponse.json({ success: true });
}

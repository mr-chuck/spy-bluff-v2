import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";
import type { GameRoom, ClientGameRoom } from "@/lib/types";
import { tallyVotesAndCheckWin, saveRoundSnapshot, checkMinPlayers, reassignHostIfNeeded } from "@/lib/game-logic";

const DISCONNECT_THRESHOLD = 15_000;
const INACTIVITY_TIMEOUT = 20 * 60 * 1000;

function sanitizeRoom(room: GameRoom, playerId: string | null): ClientGameRoom {
  const isGameOver = room.winner !== null || (room.status === "results" && room.mode === "offline");
  const isLobby = room.status === "lobby";
  const isActiveGame = !isLobby && !isGameOver;

  let myRole: "impostor" | "villager" | null = null;
  if (!isLobby && playerId) {
    const player = room.players.find((p) => p.id === playerId);
    if (player?.isSpectator) {
      myRole = null;
    } else {
      myRole = room.impostorIds.includes(playerId) ? "impostor" : "villager";
    }
  }

  const sanitizedHistory = isActiveGame
    ? room.roundHistory.map((snap) => ({ ...snap, impostorIds: [] }))
    : room.roundHistory;

  return {
    ...room, myRole, roundHistory: sanitizedHistory,
    impostorIds: isActiveGame ? [] : room.impostorIds,
    secretWord: isActiveGame ? (myRole === "villager" ? room.secretWord : null) : room.secretWord,
    wordHint: isActiveGame ? (myRole === "impostor" ? room.wordHint : null) : room.wordHint,
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = new URL(req.url);
  const playerId = url.searchParams.get("playerId");

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  let roomChanged = false;
  const now = Date.now();

  if (playerId) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) { player.lastSeenAt = now; roomChanged = true; }
  }

  const isActiveGame = room.status === "playing" || room.status === "voting";

  if (isActiveGame && now - room.lastActivity > INACTIVITY_TIMEOUT) {
    room.status = "results"; room.winner = null;
    room.winReason = "Game ended due to inactivity.";
    room.notifications.push({ message: "Game ended due to inactivity.", timestamp: now });
    saveRoundSnapshot(room); roomChanged = true;
  }

  if ((room.status === "playing" || room.status === "voting") && room.mode !== "offline") {
    const disconnected: string[] = [];
    for (const p of room.players) {
      if (p.isAlive && !p.isSpectator && p.lastSeenAt && (now - p.lastSeenAt > DISCONNECT_THRESHOLD)) {
        disconnected.push(p.id);
      }
    }
    for (const dcId of disconnected) {
      const dcPlayer = room.players.find((p) => p.id === dcId)!;
      const wasHost = dcPlayer.isHost;
      room.players = room.players.map((p) => p.id === dcId ? { ...p, isAlive: false } : p);
      reassignHostIfNeeded(room, dcId, wasHost);
      room.notifications.push({ message: `${dcPlayer.name} disconnected.`, timestamp: now });
      const indexInTurnOrder = room.turnOrder.indexOf(dcId);
      room.turnOrder = room.turnOrder.filter((id) => id !== dcId);
      if (room.status === "playing") {
        if (indexInTurnOrder !== -1 && indexInTurnOrder < room.currentTurnIndex) {
          room.currentTurnIndex = Math.max(0, room.currentTurnIndex - 1);
        }
        if (room.currentTurnIndex >= room.turnOrder.length && room.turnOrder.length > 0) {
          room.status = "voting";
        }
      }
      if (checkMinPlayers(room)) { roomChanged = true; break; }
      if (room.status === "voting") {
        const alive = room.players.filter((p) => p.isAlive && !p.isSpectator);
        const allVoted = alive.length > 0 && alive.every((p) => p.hasVoted);
        if (allVoted) { tallyVotesAndCheckWin(room); saveRoundSnapshot(room); }
      }
      roomChanged = true;
    }
  }

  const beforeLen = room.notifications.length;
  room.notifications = room.notifications.filter((n) => now - n.timestamp < 60_000);
  if (room.notifications.length !== beforeLen) roomChanged = true;

  if (roomChanged) await setRoom(room);
  return NextResponse.json(sanitizeRoom(room, playerId));
}

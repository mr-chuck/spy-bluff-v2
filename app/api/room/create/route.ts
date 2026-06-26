import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { setRoom } from "@/lib/store";
import type { GameMode, GameRoom, Player } from "@/lib/types";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const mode: GameMode = body.mode === "offline" ? "offline" : "online";
  const expectedPlayerCount = Math.min(20, Math.max(3, body.expectedPlayerCount ?? 6));
  const maxImpostors = Math.floor(expectedPlayerCount / 3);
  const impostorCount = Math.min(maxImpostors, Math.max(1, body.impostorCount ?? 1));

  const playerId = uuidv4();
  const code = generateCode();
  const now = Date.now();

  const host: Player = {
    id: playerId, name: name.trim().slice(0, 20), isHost: true, isAlive: true,
    isSpectator: false, clue: null, hasVoted: false, vote: null, joinedAt: now, lastSeenAt: now,
  };

  const room: GameRoom = {
    code, players: [host], status: "lobby", mode, round: 0,
    expectedPlayerCount, impostorCount, impostorIds: [], secretWord: null,
    wordHint: null, wordCategory: null, currentTurnIndex: 0, turnOrder: [],
    voteResult: null, winner: null, winReason: null, roundHistory: [],
    createdAt: now, gameStartedAt: null, lastActivity: now, notifications: [],
  };

  await setRoom(room);
  return NextResponse.json({ code, playerId });
}

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getRoom, setRoom } from "@/lib/store";
import type { Player } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { name } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  if (room.players.length >= room.expectedPlayerCount) {
    return NextResponse.json({ error: "Room is full" }, { status: 400 });
  }

  const trimmedName = name.trim().slice(0, 20);
  if (room.players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
    return NextResponse.json({ error: "Name already taken in this room" }, { status: 400 });
  }

  const now = Date.now();
  const isGameActive = room.status === "playing" || room.status === "voting" || room.status === "results";

  const playerId = uuidv4();
  const player: Player = {
    id: playerId, name: trimmedName, isHost: false, isAlive: true,
    isSpectator: isGameActive, clue: null, hasVoted: false, vote: null,
    joinedAt: now, lastSeenAt: now,
  };

  room.players.push(player);
  room.lastActivity = now;
  if (!isGameActive) {
    room.notifications.push({ message: `${trimmedName} joined the room.`, timestamp: now });
  }

  await setRoom(room);
  return NextResponse.json({ playerId });
}

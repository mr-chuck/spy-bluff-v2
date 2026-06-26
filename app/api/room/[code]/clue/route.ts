import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, clue } = await req.json();

  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "playing") {
    return NextResponse.json({ error: "Not in playing phase" }, { status: 400 });
  }

  const currentId = room.turnOrder[room.currentTurnIndex];
  if (currentId !== playerId) {
    return NextResponse.json({ error: "Not your turn" }, { status: 403 });
  }

  if (!clue || typeof clue !== "string" || clue.trim().length < 1) {
    return NextResponse.json({ error: "Clue is required" }, { status: 400 });
  }

  room.players = room.players.map((p) =>
    p.id === playerId ? { ...p, clue: clue.trim().slice(0, 50) } : p
  );

  room.currentTurnIndex += 1;
  room.lastActivity = Date.now();

  if (room.currentTurnIndex >= room.turnOrder.length) {
    room.status = "voting";
  }

  await setRoom(room);
  return NextResponse.json({ success: true });
}

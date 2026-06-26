import { NextResponse } from "next/server";
import { getRoom, setRoom } from "@/lib/store";
import { saveRoundSnapshot } from "@/lib/game-logic";

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
    return NextResponse.json({ error: "Only the host can end the game" }, { status: 403 });
  }

  room.status = "results";
  room.winner = "crew";
  room.winReason = "Game ended by the host.";
  room.lastActivity = Date.now();
  saveRoundSnapshot(room);

  await setRoom(room);
  return NextResponse.json({ success: true });
}

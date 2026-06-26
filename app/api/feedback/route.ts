import { NextResponse } from "next/server";
import { submitFeedback, getFeedbackStats } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, rating, feedback } = body;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (!feedback || typeof feedback !== "string" || feedback.trim().length < 1) {
      return NextResponse.json({ error: "Feedback text is required" }, { status: 400 });
    }

    const entry = await submitFeedback(name || null, email || null, rating, feedback.trim().slice(0, 1000));
    return NextResponse.json({ success: true, id: entry.id });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = await getFeedbackStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getTournamentProgress } from "@/lib/progress-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json({ steps: getTournamentProgress(id, 800) });
}

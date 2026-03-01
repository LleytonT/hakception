import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: hackathon, error } = await supabase
    .from("hackathons")
    .insert({ name, description: description ?? null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ hackathon });
}

// M2: create/list tickets against Supabase.
//
// Uses the service-role key server-side so this route isn't blocked by
// row-level security policies meant to restrict the anon/browser key.
// The service-role key must never be exposed to the client.

import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http";
import { getServiceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tickets: data });
}

export async function POST(request: Request) {
  const { data: body, error: parseError } = await parseJsonBody<{
    raw_text?: string;
    submitter?: string;
    channel?: string;
    submitted_urgency?: string;
  }>(request);

  if (parseError || !body) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  const { raw_text, submitter, channel, submitted_urgency } = body;

  if (!raw_text || typeof raw_text !== "string") {
    return NextResponse.json(
      { error: "raw_text is required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({ raw_text, submitter, channel, submitted_urgency })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ticket: data });
}

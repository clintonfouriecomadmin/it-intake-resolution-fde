// M2: create/list tickets against Supabase.
//
// Uses the service-role key server-side so this route isn't blocked by
// row-level security policies meant to restrict the anon/browser key.
// The service-role key must never be exposed to the client.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
  const body = await request.json();
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

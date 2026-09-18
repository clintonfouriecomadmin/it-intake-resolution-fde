// M2: calls Gemini via lib/classification.ts, then stores the result.
//
// This is the ONLY place in the system an AI judgment call is made. It
// deliberately does NOT decide routing — see lib/routing.ts (M3) — even
// though it would be easy to bolt that on here. Keeping this route's
// responsibility narrow is what makes the AI/deterministic split real
// instead of just a diagram in the docs.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyTicket } from "@/lib/classification";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { ticket_id, raw_text } = body;

  if (!ticket_id || !raw_text) {
    return NextResponse.json(
      { error: "ticket_id and raw_text are required" },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await classifyTicket(raw_text);
  } catch (err: any) {
    // Design-for-failure: if Gemini is down or returns something unusable,
    // surface a clear 502 rather than a generic 500 or a silent fallback
    // classification. In M3, the frontend/routing layer should treat a
    // failed classification the same as "low confidence" — send to human
    // review rather than guessing.
    return NextResponse.json(
      { error: `Classification failed: ${err.message}` },
      { status: 502 }
    );
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("classifications")
    .insert({
      ticket_id,
      category: result.category,
      extracted_issue: result.extractedIssue,
      confidence: result.confidence,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ classification: data });
}

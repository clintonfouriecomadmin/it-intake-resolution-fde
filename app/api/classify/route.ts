// M2 (classification) + M6 fix (fallback on failure).
//
// M6 finding: the original version returned a 502 on Gemini failure and
// wrote NOTHING to the database. That left the ticket with no
// classification row and no audit_log entry — invisible to /review and
// /dashboard forever. Confirmed via a live outage test (see
// docs/build-journal.md) where several test tickets ended up permanently
// orphaned this way.
//
// Fix: on failure, insert a fallback classification instead of bailing out.
// category="other", confidence=0 — this guarantees the ticket flows into
// the existing deterministic routing (lib/routing.ts), which already sends
// anything below the confidence threshold to the priority queue. No new
// routing rule needed; the existing "low confidence -> priority queue" rule
// now also covers "AI unavailable," which is the correct treatment per the
// discovery brief (a failed classification should be treated the same as a
// low-confidence one, never silently dropped).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyTicket, ClassificationResult } from "@/lib/classification";
import { parseJsonBody } from "@/lib/http";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const { data: body, error: parseError } = await parseJsonBody<{
    ticket_id?: string;
    raw_text?: string;
  }>(request);

  if (parseError || !body) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  const { ticket_id, raw_text } = body;

  if (!ticket_id || !raw_text) {
    return NextResponse.json(
      { error: "ticket_id and raw_text are required" },
      { status: 400 }
    );
  }

  let result: ClassificationResult;
  let aiFailed = false;
  let aiFailureReason = "";

  try {
    result = await classifyTicket(raw_text);
  } catch (err: any) {
    aiFailed = true;
    aiFailureReason = err.message ?? "Unknown classification error";
    // Fallback classification — confidence 0 guarantees priority-queue
    // routing via the existing threshold rule in lib/routing.ts.
    result = {
      category: "other",
      extractedIssue: `AI classification unavailable (${aiFailureReason}). Original text: ${raw_text.slice(
        0,
        300
      )}`,
      confidence: 0,
    };
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
    // Note: at this point the ticket may still end up orphaned if the
    // Supabase write itself fails — that's a separate, much rarer failure
    // mode (database outage) not addressed here. Worth flagging as a known
    // limitation rather than solving both at once.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ classification: data, aiFailed, aiFailureReason });
}

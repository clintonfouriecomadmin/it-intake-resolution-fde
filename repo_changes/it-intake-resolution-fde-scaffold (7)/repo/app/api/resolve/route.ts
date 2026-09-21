// M3: applies the deterministic rules in lib/routing.ts to a ticket's
// classification and logs the outcome to audit_log.
//
// decided_by is "system" here, not "ai" — this is a rule-based decision made
// by plain code, and not "human" either, since no person has reviewed it
// yet. Keeping these three values distinct (ai / system / human:<name>) is
// what makes the audit trail actually useful for answering "who or what
// made this call" later.

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabaseServer";
import { decideRouting } from "@/lib/routing";
import type { ClassificationResult, TicketCategory } from "@/lib/classification";
import { parseJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const { data: body, error: parseError } = await parseJsonBody<{
    ticket_id?: string;
  }>(request);

  if (parseError || !body) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  const { ticket_id } = body;

  if (!ticket_id) {
    return NextResponse.json(
      { error: "ticket_id is required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Pull the most recent classification for this ticket rather than trusting
  // a classification payload passed in from the client — the client could be
  // stale or tampered with, and routing decisions should be based on what's
  // actually stored.
  const { data: classificationRow, error: fetchError } = await supabase
    .from("classifications")
    .select("*")
    .eq("ticket_id", ticket_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !classificationRow) {
    return NextResponse.json(
      { error: "No classification found for this ticket_id" },
      { status: 404 }
    );
  }

  const classification: ClassificationResult = {
    category: classificationRow.category as TicketCategory,
    extractedIssue: classificationRow.extracted_issue,
    confidence: classificationRow.confidence,
  };

  const decision = decideRouting(classification);

  const { data: auditRow, error: auditError } = await supabase
    .from("audit_log")
    .insert({
      ticket_id,
      action: decision.queue === "priority" ? "queued_priority" : "queued_standard",
      decided_by: "system",
      notes: decision.reason,
    })
    .select()
    .single();

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 500 });
  }

  return NextResponse.json({ decision, audit: auditRow });
}

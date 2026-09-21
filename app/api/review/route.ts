// M4: the only place in the system that sets priority or assigned_to — and
// it requires a reviewer_name, so the audit trail always shows a named human
// behind the decision, never a bare "approved" with no accountable party.
// This is the direct code-level enforcement of the discovery brief's
// requirement that these decisions always have human approval.

import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http";
import { getServiceClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const { data: body, error: parseError } = await parseJsonBody<{
    ticket_id?: string;
    reviewer_name?: string;
    category?: string;
    priority?: string;
    assigned_to?: string;
    notes?: string;
  }>(request);

  if (parseError || !body) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }

  const { ticket_id, reviewer_name, category, priority, assigned_to, notes } = body;

  if (!ticket_id || !reviewer_name || !priority || !assigned_to) {
    return NextResponse.json(
      {
        error:
          "ticket_id, reviewer_name, priority, and assigned_to are required",
      },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  const { data: latestClassification } = await supabase
    .from("classifications")
    .select("*")
    .eq("ticket_id", ticket_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const overrode =
    !!latestClassification &&
    !!category &&
    category !== latestClassification.category;

  const { data, error } = await supabase
    .from("audit_log")
    .insert({
      ticket_id,
      action: overrode ? "reviewer_overrode" : "reviewer_approved",
      decided_by: `human:${reviewer_name}`,
      priority,
      assigned_to,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ audit: data });
}

-- IT Intake & Resolution — core schema
-- Run this in the Supabase SQL editor once the project is created.

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  submitter text,
  channel text, -- 'email' | 'teams' | 'walk_up' | 'form'
  submitted_urgency text, -- how the submitter self-rated it, if at all
  created_at timestamptz not null default now()
);

create table if not exists classifications (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id),
  category text not null,
  extracted_issue text not null,
  confidence numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets (id),
  action text not null, -- 'queued_standard' | 'queued_priority' | 'reviewer_approved' | 'reviewer_overrode'
  decided_by text not null, -- 'system' (routing rule) | 'human:<reviewer_name>'
  priority text,
  assigned_to text,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes for the dashboard's headline metric: time-to-human-review
create index if not exists idx_audit_log_ticket_id on audit_log (ticket_id);
create index if not exists idx_tickets_created_at on tickets (created_at);

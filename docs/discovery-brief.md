# Discovery Brief — IT Helpdesk Intake-to-Resolution System

**Engagement stage:** M0 — Discovery
**Stakeholder:** Alex Nkosi, IT Operations Director
**Organisation profile:** ~300 employees, two manufacturing plant sites + head office
**IT team:** Two technicians (Sipho — networking/infrastructure lean; Dee — applications/ERP lean)

---

## 1. Current-State Workflow (as observed, not idealised)

Intake channels: legacy `helpdesk@` inbox, an informal Teams channel, and walk-ups.

Real example (printer ticket): employee emails `helpdesk@` with a three-paragraph message. First line mentions a printer; the real issue — inability to access the ERP system during month-end — is buried in the last line. The technician who happens to open the inbox first skims, tags it mentally by the first line, and moves on. No one is formally assigned ownership. The buried ERP issue sat unresolved for roughly half a day before a second technician caught it by chance.

**Observed workflow:**
```
Employee → (email / Teams / walk-up) → whichever tech sees it first
        → skims and interprets priority by gut feel
        → either acts immediately or lets it sit if it reads as minor
        → no formal assignment step — whoever picks it up owns it
```

## 2. Accountability Model

- **Ultimate accountability:** Alex, when something escalates or gets missed.
- **Day-to-day triage ownership:** informal — no designated owner, no backup if a technician is out or overloaded.
- **Escalation trigger today:** largely informal — Alex often finds out via a hallway conversation or a direct call from a site manager, not a system.
- **Priority is currently technician judgment**, not a documented or organisational decision. No priority matrix exists today.

## 3. What "Serious" Actually Means at This Organisation

Derived from real recent examples, not a generic severity scale:

- ERP outage affecting the whole company (halts production reporting)
- Any outage touching production-floor systems specifically (not general office IT) — direct cost-per-minute impact
- Security-flavored issues near month-end (locked accounts, phishing clicks) — elevated because of financial exposure
- Anything a site manager or executive personally raises tends to get bumped in practice, regardless of technical severity

This list becomes the seed set for classification examples and the "high-stakes category" rule in the routing logic.

## 4. Assignment Logic Today

- Loose expertise split (Sipho: network/infra, Dee: apps/ERP) but in practice assignment is "whoever isn't drowning."
- Site familiarity matters informally (Dee knows Site B's older equipment better).
- When one technician is unavailable, the other handles tickets outside their normal area — this is where errors and delays concentrate.

## 5. Missing-Information Handling

No consistent owner. Depends entirely on which technician picks up the ticket — sometimes a clarifying question is sent and goes unanswered for a day, sometimes the technician just walks over. No standard process exists.

## 6. AI Responsibility Boundary (agreed with stakeholder)

This is the core design constraint for the system — captured directly from the stakeholder interview, not assumed:

| Decision | AI may recommend | AI may execute | Human approval required |
|---|---|---|---|
| Categorise ticket | Yes | Yes | No |
| Extract the real issue from unstructured text | Yes | Yes | No |
| Assign technician | Yes | No | **Yes** |
| Set priority | Yes | No | **Yes** |
| Escalate | Yes | No | **Yes** |
| Request missing info from user | Yes (draft only) | No | **Yes** |
| Take technical action | No | No | Out of scope — human only |

**Design implication:** confidence score alone does not decide auto-execution. Only categorisation and issue-extraction are eligible for auto-execution under any circumstance. Everything touching priority, assignment, or escalation routes to the Human-in-the-Loop queue by policy, regardless of AI confidence.

## 7. Success Criteria (90-day framing)

**Stated priority:** stop losing serious issues in the noise of routine tickets.

**Success metric:** time from ticket received to a serious issue being *looked at* by a human, target under 15 minutes — versus the current pattern of serious issues sometimes sitting for hours behind routine-looking tickets.

**How they'd know it worked:** going a full quarter without a repeat of the "how did this sit for six hours" pattern.

---

## 8. Implications for Build Scope

- Routing logic must hard-code the approval boundary above — this is a policy decision, not a confidence threshold to be tuned later.
- Seed/demo data should include realistic "buried lede" tickets (like the printer/ERP example) to demonstrate the extraction capability that most excited the stakeholder.
- The dashboard's headline metric should be time-to-human-review for high-stakes categories, not generic ticket-volume stats — this directly reflects the stated success criteria.
- No auto-contact of end users and no auto-technical-actions in this build, by explicit stakeholder instruction — keep this visible in the architecture doc as a deliberate scope boundary, not an omission.

*Compiled from the M0 discovery interview. To be revisited if scope or constraints shift in later milestones.*

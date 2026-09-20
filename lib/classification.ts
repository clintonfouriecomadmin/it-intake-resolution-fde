// M2: Gemini-backed classification.
//
// Scope, per the discovery brief (docs/discovery-brief.md, section 6):
// the model is ONLY responsible for categorisation and issue extraction.
// It must NOT decide assignment, priority, or escalation — those are
// deterministic decisions made in routing.ts (M3), never left to model
// judgment even implicitly via prompt wording.

import { GoogleGenAI } from "@google/genai";

export type TicketCategory =
  | "hardware"
  | "software"
  | "network"
  | "access"
  | "erp"
  | "other";

export interface ClassificationResult {
  category: TicketCategory;
  extractedIssue: string; // the real problem, pulled out of messy raw text
  confidence: number; // 0–1
}

const CATEGORIES: TicketCategory[] = [
  "hardware",
  "software",
  "network",
  "access",
  "erp",
  "other",
];

// Seed examples drawn directly from the M0 discovery interview (section 3
// of the discovery brief) rather than invented ones — the classifier should
// learn what "serious" looks like from the same examples the stakeholder gave.
const SYSTEM_INSTRUCTION = `You are the classification step in an IT helpdesk triage system for a manufacturing company (two plant sites + head office).

Your ONLY job is to:
1. Assign one category: hardware, software, network, access, erp, or other.
2. Extract the real underlying issue from the raw text, even if it's buried under unrelated complaints or vague wording (e.g. "wifi broken again" with no other detail, or a long email about a printer that mentions an ERP login problem in the last line).
3. Give a confidence score from 0 to 1 for your categorisation.

You do NOT decide priority, urgency, who should handle it, or whether to escalate. Do not include those judgments even as a side comment — another part of the system handles that deterministically.

Categories that tend to be ERP or access related (e.g. "can't log into ERP", "account locked", "phishing email clicked") should be tagged erp or access respectively — these are treated as high-stakes downstream, so accuracy on category matters more than on other fields.

Respond only with the structured JSON requested — no extra commentary.`;

const responseSchema = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING", enum: CATEGORIES },
    extracted_issue: { type: "STRING" },
    confidence: { type: "NUMBER" },
  },
  required: ["category", "extracted_issue", "confidence"],
} as const;

function getClient(): GoogleGenAI {
  // Read the key on every call. A module-level client would keep serving
  // the first key loaded in this process, so a rotated or deliberately
  // invalid GEMINI_API_KEY in .env.local would be ignored until restart.
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}

export async function classifyTicket(
  rawText: string
): Promise<ClassificationResult> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  const response = await ai.models.generateContent({
    model,
    contents: rawText,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  let parsed: {
    category: string;
    extracted_issue: string;
    confidence: number;
  };

  try {
    parsed = JSON.parse(text);
  } catch {
    // Design-for-failure: a malformed response should raise a clear error,
    // not silently produce a fabricated classification. The caller (the
    // /api/classify route) is responsible for deciding the fallback
    // behaviour — likely "send straight to human review."
    throw new Error(`Gemini returned non-JSON output: ${text.slice(0, 200)}`);
  }

  const category = CATEGORIES.includes(parsed.category as TicketCategory)
    ? (parsed.category as TicketCategory)
    : "other";

  return {
    category,
    extractedIssue: parsed.extracted_issue,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence))),
  };
}

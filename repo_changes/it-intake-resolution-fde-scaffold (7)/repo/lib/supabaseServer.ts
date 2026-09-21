// Next.js 14 App Router patches the global `fetch` and caches GET requests
// by URL unless told not to. supabase-js makes its REST GET calls (e.g.
// `.from("tickets").select()`) through that same patched `fetch`, so without
// this, Supabase reads get silently cached — a route-level `cache: "no-store"`
// on the outer request does NOT reach this inner fetch. This was diagnosed
// directly from a real bug: /api/metrics kept returning a stale
// classifiedCount of 0 in ~10ms (a cache hit) while /api/review-queue showed
// live data, because the two routes happened to hit Supabase in a different
// order relative to the cache being populated.
//
// Every server-side Supabase client in this project MUST come from this
// file. Do not reintroduce a local `createClient(url, key)` with no fetch
// override in any route — that silently reintroduces the bug.

import { createClient } from "@supabase/supabase-js";

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  }

  return createClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

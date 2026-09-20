// Every API route was calling `await request.json()` directly, which
// throws on a genuinely empty or non-JSON body — that exception was
// uncaught, so Next.js returned a bare 500 instead of a clean validation
// error. Centralising this fixes it everywhere at once instead of adding
// the same try/catch to four separate route files.

export async function parseJsonBody<T = any>(
  request: Request
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = (await request.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: "Invalid or missing JSON body" };
  }
}

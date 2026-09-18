import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side / anon-key client. For server-side routes that need to write
// audit log entries with elevated privileges, create a separate service-role
// client in the API route itself using SUPABASE_SERVICE_ROLE_KEY — never
// expose the service role key to the browser.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

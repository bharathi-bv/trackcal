/**
 * supabase.ts
 *
 * Two Supabase clients — same pattern used by Cal.com, Formbricks, and most
 * Next.js SaaS apps:
 *
 * 1. `supabase` (browser client) — uses the anon key, safe to import in client
 *    components. Respects Row Level Security (RLS). Suitable for reading public
 *    data or user-scoped operations once auth is added (Phase 6).
 *
 * 2. `createServerClient()` — uses the service_role key which bypasses RLS and
 *    has full database access. ONLY import this in API routes (route.ts files).
 *    Never use in client components — the service_role key would leak to the browser.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-safe client — import this anywhere
export const supabase = createClient(url, anonKey);

// Server-only client — only import in src/app/api/**/route.ts files
export function createServerClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * supabase-browser.ts
 *
 * Browser-side Supabase auth client for use in client components.
 * Safe to import in any "use client" file — no server-only dependencies.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createAuthBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

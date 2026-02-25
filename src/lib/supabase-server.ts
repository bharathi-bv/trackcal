/**
 * supabase-server.ts
 *
 * Server-side Supabase auth client — reads/writes session cookies.
 * Only import this in server components and API route handlers.
 * Never import in "use client" files — next/headers is server-only.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignored in Server Components — middleware handles session refresh
          }
        },
      },
    }
  );
}

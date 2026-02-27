/**
 * GET /auth/signout
 *
 * Signs the user out via Supabase Auth (clears the session cookie)
 * and redirects to /login.
 *
 * Used as a plain <a href="/auth/signout"> link from the member portal
 * where a client-side SignOutButton isn't available.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}

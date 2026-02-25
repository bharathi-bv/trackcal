/**
 * GET /auth/callback
 *
 * Handles two types of redirects from Supabase:
 * 1. Email confirmation — user clicks link in their inbox, lands here with ?code=xxx
 * 2. Google OAuth — Supabase redirects here after Google consent with ?code=xxx
 *
 * exchangeCodeForSession() converts the one-time code into a real session
 * and sets the session cookie. Then we redirect to the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createAuthServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

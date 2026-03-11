/**
 * GET /api/auth/google/callback
 *
 * Google redirects here after the host approves Calendar access.
 * The URL contains ?code=xxx — we exchange it for access + refresh tokens,
 * then save those tokens to the host_settings table in Supabase.
 *
 * After success, redirects to dashboard settings with a success signal.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exchangeCodeAndSave } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  // User denied access on Google's consent screen
  if (error) {
    console.error("[google/callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?calendar_error=access_denied", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?calendar_error=no_code", request.url)
    );
  }

  const state = request.nextUrl.searchParams.get("state");
  const isOnboarding = state === "onboarding";

  try {
    const { userId } = await auth();
    await exchangeCodeAndSave(code, userId ?? undefined);
    const successUrl = isOnboarding
      ? "/app/getting-started"
      : "/app/availability?tab=calendar&calendar_connected=google";
    return NextResponse.redirect(new URL(successUrl, request.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[google/callback] token exchange failed:", msg);
    const base = isOnboarding
      ? "/app/connect-calendar"
      : "/app/availability?tab=calendar";
    const errorUrl = `${base}&calendar_error=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(new URL(errorUrl, request.url));
  }
}

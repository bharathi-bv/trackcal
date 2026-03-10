/**
 * GET /api/auth/google/member/callback
 *
 * Google redirects here after a team member approves Calendar access.
 * The URL contains ?code=xxx&state=member_uuid.
 * We exchange the code for tokens and save them to the team_members row.
 *
 * After success, redirects to /app/dashboard/settings with a success signal
 * so the admin can see the "Calendar connected" badge update.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeAndSaveForMember } from "@/lib/google-calendar";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state"); // member UUID
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    console.error("[google/member/callback] OAuth error:", error);
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?tab=team&member_error=access_denied", request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?tab=team&member_error=missing_params", request.url)
    );
  }

  try {
    await exchangeCodeAndSaveForMember(code, state);

    // Check whether the person completing OAuth has an active CitaCal session.
    // Self-service flow (came from /api/auth/google/member/self): user is logged in → /app/member/settings
    // Admin-shared link flow (old): no session → /app/dashboard/settings for the admin to see
    const { userId } = await auth();

    if (userId) {
      return NextResponse.redirect(
        new URL("/app/member/settings?connected=1", request.url)
      );
    }
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?tab=team&member_connected=1", request.url)
    );
  } catch (err) {
    console.error("[google/member/callback] token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/app/dashboard/settings?tab=team&member_error=exchange_failed", request.url)
    );
  }
}

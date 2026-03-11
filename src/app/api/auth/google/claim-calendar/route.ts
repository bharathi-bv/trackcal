/**
 * GET /api/auth/google/claim-calendar
 *
 * Called after a new Google OAuth signup where additionalOauthScopes included
 * Google Calendar scopes. Retrieves the granted access token from Clerk's backend
 * and saves it to host_settings so the rest of the app can use it.
 *
 * Requires these scopes to be enabled in Clerk Dashboard:
 *   → Configure → SSO Connections → Google → Scopes:
 *     https://www.googleapis.com/auth/calendar
 *     https://www.googleapis.com/auth/calendar.events
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { listGoogleCalendarsForAuth } from "@/lib/google-calendar";
import { google } from "googleapis";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const clerk = await clerkClient();
    const tokens = await clerk.users.getUserOauthAccessToken(userId, "oauth_google");
    const oauthToken = tokens.data?.[0] ?? tokens[0] ?? null;

    if (!oauthToken?.token) {
      // Token not available — fall back to standard calendar OAuth
      return NextResponse.redirect(
        new URL("/api/auth/google?from=onboarding", request.url)
      );
    }

    // Verify the token actually has calendar scopes
    const grantedScopes: string[] = oauthToken.scopes ?? [];
    const hasCalendarScope = CALENDAR_SCOPES.some((s) => grantedScopes.includes(s));

    if (!hasCalendarScope) {
      // Scopes not granted (user may have unchecked calendar) — send to standard calendar OAuth
      return NextResponse.redirect(
        new URL("/api/auth/google?from=onboarding", request.url)
      );
    }

    // Build an oauth2 client using the Clerk-provided access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ access_token: oauthToken.token });

    // Get the user's primary calendar
    const calendars = await listGoogleCalendarsForAuth(oauth2Client);
    const defaultCalendarId = calendars.find((c) => c.isPrimary)?.id ?? "primary";

    // Save to host_settings — Clerk manages token refresh so no refresh_token stored
    const db = createServerClient();
    const { data: existing } = await db
      .from("host_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const tokenData = {
      google_access_token: oauthToken.token,
      // Clerk-managed tokens expire in ~1hr; store synthetic expiry
      google_token_expiry: String(Date.now() + 55 * 60 * 1000),
      google_calendar_ids: [defaultCalendarId],
      calendar_provider: "google",
      microsoft_access_token: null,
      microsoft_refresh_token: null,
      microsoft_token_expiry: null,
      microsoft_calendar_ids: [],
    };

    if (existing) {
      await db.from("host_settings").update(tokenData).eq("id", existing.id);
    } else {
      await db.from("host_settings").insert({ ...tokenData, user_id: userId });
    }

    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  } catch (err) {
    console.error("[claim-calendar] failed:", err);
    // Fall back to standard calendar OAuth rather than blocking the user
    return NextResponse.redirect(
      new URL("/api/auth/google?from=onboarding", request.url)
    );
  }
}

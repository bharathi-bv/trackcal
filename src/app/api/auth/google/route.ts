/**
 * GET /api/auth/google
 *
 * Entry point for Google Calendar OAuth.
 * Visiting this URL redirects the host to Google's consent screen.
 *
 * After approval, Google redirects back to /api/auth/google/callback.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") ?? undefined;
  const url = getAuthUrl(from);
  return NextResponse.redirect(url);
}

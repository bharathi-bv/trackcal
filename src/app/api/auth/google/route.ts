/**
 * GET /api/auth/google
 *
 * Entry point for Google Calendar OAuth.
 * Visiting this URL redirects the host to Google's consent screen.
 *
 * After approval, Google redirects back to /api/auth/google/callback.
 */

import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  const url = getAuthUrl();
  return NextResponse.redirect(url);
}

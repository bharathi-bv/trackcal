/**
 * GET /api/auth/google/member?member_id=uuid
 *
 * Initiates Google Calendar OAuth for a team member.
 * Admin generates this link and sends it to the team member.
 * The member clicks it, consents to Calendar access, and gets
 * redirected back to /api/auth/google/member/callback.
 *
 * The member_id is passed through as the OAuth `state` param so the
 * callback knows which team_members row to update with the tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUrlForMember } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const memberId = request.nextUrl.searchParams.get("member_id");

  if (!memberId) {
    return NextResponse.json({ error: "member_id param required" }, { status: 400 });
  }

  const url = getAuthUrlForMember(memberId);
  return NextResponse.redirect(url);
}

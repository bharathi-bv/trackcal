/**
 * GET /api/auth/google/member/self
 *
 * Self-service Google Calendar OAuth start for team members.
 * Unlike /api/auth/google/member (admin-generated link that uses ?member_id=),
 * this route looks up the member by the currently logged-in user's auth session.
 *
 * Flow:
 * 1. Team member is logged into their TrackCal account (via invite email)
 * 2. They click "Connect Google Calendar" on /member/settings
 * 3. This route looks up their team_members row by user_id → calls getAuthUrlForMember
 * 4. Google OAuth callback saves tokens and redirects to /member/settings?connected=1
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import { getAuthUrlForMember } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const db = createServerClient();
  const { data: member } = await db
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    // Logged in but not a team member — shouldn't happen in normal flow
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authUrl = getAuthUrlForMember(member.id);
  return NextResponse.redirect(authUrl);
}

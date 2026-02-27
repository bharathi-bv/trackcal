/**
 * GET /auth/callback
 *
 * Handles two types of redirects from Supabase:
 * 1. Email confirmation — user clicks link in their inbox, lands here with ?code=xxx
 * 2. Google OAuth — Supabase redirects here after Google consent with ?code=xxx
 * 3. Team member invite — Supabase invite link lands here, links user_id to team_members
 *
 * exchangeCodeForSession() converts the one-time code into a real session
 * and sets the session cookie. Then we check if the user is a team member
 * (by matching email) and redirect accordingly.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createAuthServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Check if this user is a pending team member invite
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const db = createServerClient();
      // Find a team_members row that matches this email but hasn't been linked yet
      const { data: member } = await db
        .from("team_members")
        .select("id")
        .eq("email", user.email)
        .is("user_id", null)
        .maybeSingle();

      if (member) {
        // Link the auth account to the team member row
        await db
          .from("team_members")
          .update({ user_id: user.id })
          .eq("id", member.id);

        // Send team member to their own settings portal
        return NextResponse.redirect(new URL("/app/member/settings", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/app/dashboard", request.url));
}

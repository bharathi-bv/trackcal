/**
 * DELETE /api/member/calendar
 *
 * Team member self-service calendar disconnect.
 * Finds the team_members row by the logged-in user's auth session and
 * clears all three Google Calendar token columns.
 *
 * Used from /member/settings "Disconnect calendar" button.
 */

import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";

export async function DELETE() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerClient();
  const { error } = await db
    .from("team_members")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

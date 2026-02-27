/**
 * /member/settings
 *
 * Team member portal — shown after a team member accepts their invite and signs in.
 * Lets them connect and disconnect their own Google Calendar.
 *
 * If the logged-in user is not a team member (or not logged in), redirects to /auth/login.
 */

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import MemberSettingsClient from "@/components/member/MemberSettingsClient";

export default async function MemberSettingsPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const db = createServerClient();
  const { data: member } = await db
    .from("team_members")
    .select("id, name, email, photo_url, google_refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  // Not a team member — send to login
  if (!member) redirect("/login");

  return <MemberSettingsClient member={member} />;
}

/**
 * /member/settings
 *
 * Team member portal — shown after a team member accepts their invite and signs in.
 * Lets them connect and disconnect their own Google Calendar.
 *
 * If the logged-in user is not a team member (or not logged in), redirects to /auth/login.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { getMemberCalendarConnectionState } from "@/lib/calendar-connections";
import MemberSettingsClient from "@/components/member/MemberSettingsClient";

export default async function MemberSettingsPage() {
  const { userId } = await auth();

  if (!userId) redirect("/login");

  const db = createServerClient();
  const { data: member } = await db
    .from("team_members")
    .select(
      "id, name, email, photo_url, google_refresh_token, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry, microsoft_calendar_ids"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Not a team member — send to login
  if (!member) redirect("/login");

  const { data: collectiveEvents } = await db
    .from("event_types")
    .select(
      "id, name, slug, assigned_member_ids, team_scheduling_mode, collective_show_availability_tiers"
    )
    .eq("is_active", true)
    .contains("assigned_member_ids", [member.id])
    .order("created_at", { ascending: true });

  const calendarState = await getMemberCalendarConnectionState({
    id: member.id,
    google_access_token: null,
    google_refresh_token: member.google_refresh_token,
    google_token_expiry: null,
    google_calendar_ids: member.google_calendar_ids ?? [],
    microsoft_access_token: member.microsoft_access_token,
    microsoft_refresh_token: member.microsoft_refresh_token,
    microsoft_token_expiry: member.microsoft_token_expiry,
    microsoft_calendar_ids: member.microsoft_calendar_ids ?? [],
  });

  return (
    <Suspense>
      <MemberSettingsClient
        member={member}
        collectiveEvents={collectiveEvents ?? []}
        connectedCalendars={calendarState.calendars}
        selectedCalendarIds={calendarState.selectedCalendarIds}
      />
    </Suspense>
  );
}

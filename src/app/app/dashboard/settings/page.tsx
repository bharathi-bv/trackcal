import { createServerClient } from "@/lib/supabase";
import { getHostCalendarConnectionState } from "@/lib/calendar-connections";
import DashboardNav from "@/components/dashboard/DashboardNav";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const db = createServerClient();
  const [{ data: hostSettings }, { data: teamMembers }, hostCalendarState, { count: activeLinksCount }] = await Promise.all([
    db
      .from("host_settings")
      .select("google_refresh_token, microsoft_refresh_token, google_calendar_ids, microsoft_calendar_ids, calendar_provider, host_name, profile_photo_url, booking_base_url, weekly_availability, webhook_urls, zoom_refresh_token, sheet_refresh_token, sheet_id")
      .limit(1)
      .maybeSingle(),
    db
      .from("team_members")
      .select("id, name, email, photo_url, is_active, google_refresh_token, microsoft_refresh_token, last_booking_at, created_at")
      .order("created_at", { ascending: true }),
    getHostCalendarConnectionState(),
    db.from("event_types").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const calendarConnected = Boolean(
    hostSettings?.google_refresh_token || hostSettings?.microsoft_refresh_token
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <DashboardNav
        activeTab="settings"
        activeLinks={activeLinksCount ?? 0}
        email=""
      />
      <main
        className="dashboard-main"
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        <SettingsClient
          initial={{
            host_name: hostSettings?.host_name ?? null,
            profile_photo_url: hostSettings?.profile_photo_url ?? null,
            booking_base_url: hostSettings?.booking_base_url ?? null,
            webhook_urls: hostSettings?.webhook_urls ?? [],
            calendar_provider: hostSettings?.calendar_provider ?? null,
            google_refresh_token: hostSettings?.google_refresh_token ?? null,
            microsoft_refresh_token: hostSettings?.microsoft_refresh_token ?? null,
            google_calendar_ids: hostSettings?.google_calendar_ids ?? [],
            microsoft_calendar_ids: hostSettings?.microsoft_calendar_ids ?? [],
          }}
          googleAvatarUrl={null}
          initialTeamMembers={teamMembers ?? []}
          calendarConnected={calendarConnected}
          calendarProvider={
            hostSettings?.calendar_provider === "google" ||
            hostSettings?.calendar_provider === "microsoft"
              ? hostSettings.calendar_provider
              : null
          }
          connectedCalendars={hostCalendarState.calendars}
          selectedCalendarIds={hostCalendarState.selectedCalendarIds}
          zoomConnected={Boolean((hostSettings as { zoom_refresh_token?: string | null } | null)?.zoom_refresh_token)}
          sheetsConnected={Boolean((hostSettings as { sheet_refresh_token?: string | null } | null)?.sheet_refresh_token)}
          initialSheetId={(hostSettings as { sheet_id?: string | null } | null)?.sheet_id ?? null}
        />
      </main>
    </div>
  );
}

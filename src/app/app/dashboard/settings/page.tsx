import { Suspense } from "react";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import { getHostCalendarConnectionState } from "@/lib/calendar-connections";
import { ensureHostPublicSlug } from "@/lib/public-booking-links";
import DashboardNav from "@/components/dashboard/DashboardNav";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const db = createServerClient();
  const [hostPublicSlug, { data: hostSettings }, { data: teamMembers }, hostCalendarState, { count: activeLinksCount }] = await Promise.all([
    ensureHostPublicSlug({
      db,
      hostName: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null,
      email: user?.email ?? null,
    }),
    db
      .from("host_settings")
      .select("google_refresh_token, microsoft_refresh_token, google_calendar_ids, microsoft_calendar_ids, calendar_provider, host_name, public_slug, profile_photo_url, booking_base_url, weekly_availability, webhook_urls, zoom_refresh_token, sheet_refresh_token, sheet_id")
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
        <Suspense>
        <SettingsClient
          initial={{
            host_name: hostSettings?.host_name ?? null,
            public_slug: hostSettings?.public_slug ?? hostPublicSlug,
            profile_photo_url: hostSettings?.profile_photo_url ?? null,
            booking_base_url: hostSettings?.booking_base_url ?? null,
            webhook_urls: hostSettings?.webhook_urls ?? [],
            calendar_provider: hostSettings?.calendar_provider ?? null,
            google_refresh_token: hostSettings?.google_refresh_token ?? null,
            microsoft_refresh_token: hostSettings?.microsoft_refresh_token ?? null,
            google_calendar_ids: hostSettings?.google_calendar_ids ?? [],
            microsoft_calendar_ids: hostSettings?.microsoft_calendar_ids ?? [],
          }}
          account={{
            email: user?.email ?? "",
            canUsePassword:
              Array.isArray(user?.app_metadata?.providers) &&
              user.app_metadata.providers.includes("email"),
            authProviders:
              Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [],
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
        </Suspense>
      </main>
    </div>
  );
}

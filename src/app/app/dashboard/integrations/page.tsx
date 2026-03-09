import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { getHostCalendarConnectionState } from "@/lib/calendar-connections";
import IntegrationsClient from "@/components/dashboard/IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const db = createServerClient();

  const [{ data: hostSettings }, hostCalendarState] = await Promise.all([
    db
      .from("host_settings")
      .select(
        "google_refresh_token, microsoft_refresh_token, google_calendar_ids, microsoft_calendar_ids, calendar_provider, webhook_urls, zoom_refresh_token, sheet_refresh_token, sheet_id"
      )
      .limit(1)
      .maybeSingle(),
    getHostCalendarConnectionState(),
  ]);

  const calendarConnected = Boolean(
    hostSettings?.google_refresh_token || hostSettings?.microsoft_refresh_token
  );

  const webhookUrls = Array.isArray((hostSettings as { webhook_urls?: unknown } | null)?.webhook_urls)
    ? ((hostSettings as { webhook_urls?: unknown[] })!.webhook_urls!).filter(
        (v): v is string => typeof v === "string"
      )
    : [];

  return (
    <main className="dashboard-main">
      <Suspense>
        <IntegrationsClient
          calendarConnected={calendarConnected}
          calendarProvider={
            hostSettings?.calendar_provider === "google" || hostSettings?.calendar_provider === "microsoft"
              ? hostSettings.calendar_provider
              : null
          }
          connectedCalendars={hostCalendarState.calendars}
          selectedCalendarIds={hostCalendarState.selectedCalendarIds}
          zoomConnected={Boolean((hostSettings as { zoom_refresh_token?: string | null } | null)?.zoom_refresh_token)}
          sheetsConnected={Boolean((hostSettings as { sheet_refresh_token?: string | null } | null)?.sheet_refresh_token)}
          initialSheetId={(hostSettings as { sheet_id?: string | null } | null)?.sheet_id ?? null}
          initialWebhookUrls={webhookUrls}
        />
      </Suspense>
    </main>
  );
}

import { headers } from "next/headers";
import { getAvailabilitySchedules } from "@/lib/availability-schedules";
import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import EventTypesClient from "@/components/dashboard/EventTypesClient";

type EventStats = { total: number; thisMonth: number; topSource: string | null };
type EventTypeStatsRow = {
  event_slug: string;
  total: number | string;
  this_month: number | string;
  top_source: string | null;
};

export default async function EventTypesPage() {
  const db = createServerClient();
  const thisMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-02"
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const fallbackBaseUrl = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://citacal.com";

  const [{ data: eventTypes }, { data: hostSettings }, { data: statsRows }, { data: teamMembers }, availabilitySchedules] = await Promise.all([
    db.from("event_types").select("*").order("created_at", { ascending: true }),
    db.from("host_settings").select("google_refresh_token, microsoft_refresh_token, booking_base_url, zoom_refresh_token").limit(1).maybeSingle(),
    db.rpc("get_event_type_booking_stats", { month_prefix: thisMonthPrefix }),
    db.from("team_members").select("id, name, email, photo_url, google_refresh_token, microsoft_refresh_token").eq("is_active", true).order("created_at", { ascending: true }),
    getAvailabilitySchedules(db),
  ]);

  const activeLinks = (eventTypes ?? []).filter((et) => et.is_active).length;
  const bookingBaseUrl =
    hostSettings?.booking_base_url?.trim().replace(/\/+$/, "") || fallbackBaseUrl;

  // Compute per-event-type booking stats from DB-aggregated rows
  const bookingStats: Record<string, EventStats> = {};
  (statsRows as EventTypeStatsRow[] | null | undefined)?.forEach((row) => {
    if (!row?.event_slug) return;
    bookingStats[row.event_slug] = {
      total: Number(row.total ?? 0),
      thisMonth: Number(row.this_month ?? 0),
      topSource: row.top_source ?? null,
    };
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <DashboardNav
        activeTab="event-types"
        activeLinks={activeLinks}
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
        <EventTypesClient
          initialEventTypes={eventTypes ?? []}
          initialAvailabilitySchedules={availabilitySchedules}
          bookingStats={bookingStats}
          availableMembers={teamMembers ?? []}
          bookingBaseUrl={bookingBaseUrl}
          zoomConnected={Boolean((hostSettings as { zoom_refresh_token?: string | null } | null)?.zoom_refresh_token)}
        />
      </main>
    </div>
  );
}

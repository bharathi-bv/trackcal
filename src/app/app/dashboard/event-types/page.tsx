import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import EventTypesClient from "@/components/dashboard/EventTypesClient";

export default async function EventTypesPage() {
  const supabaseAuth = await createAuthServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/login");

  const db = createServerClient();
  const [{ data: eventTypes }, { data: hostSettings }, { data: bookingRows }, { data: teamMembers }] = await Promise.all([
    db.from("event_types").select("*").order("created_at", { ascending: true }),
    db.from("host_settings").select("google_refresh_token").limit(1).maybeSingle(),
    db.from("bookings").select("event_slug, utm_source, date").in("status", ["confirmed", "pending"]),
    db.from("team_members").select("id, name, email, photo_url, google_refresh_token").eq("is_active", true).order("created_at", { ascending: true }),
  ]);

  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  // Compute per-event-type booking stats
  const thisMonthPrefix = new Date().toISOString().slice(0, 7); // e.g. "2026-02"
  type EventStats = { total: number; thisMonth: number; topSource: string | null };
  const bookingStats: Record<string, EventStats> = {};
  const slugSourceCounts: Record<string, Record<string, number>> = {};
  (bookingRows ?? []).forEach((b) => {
    if (!b.event_slug) return;
    if (!bookingStats[b.event_slug]) bookingStats[b.event_slug] = { total: 0, thisMonth: 0, topSource: null };
    bookingStats[b.event_slug].total++;
    if (b.date?.startsWith(thisMonthPrefix)) bookingStats[b.event_slug].thisMonth++;
    if (b.utm_source) {
      if (!slugSourceCounts[b.event_slug]) slugSourceCounts[b.event_slug] = {};
      const c = slugSourceCounts[b.event_slug];
      c[b.utm_source] = (c[b.utm_source] ?? 0) + 1;
    }
  });
  Object.entries(slugSourceCounts).forEach(([slug, counts]) => {
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (bookingStats[slug]) bookingStats[slug].topSource = top;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <DashboardNav
        activeTab="event-types"
        calendarConnected={calendarConnected}
        email={user.email ?? ""}
      />

      <main
        className="dashboard-main"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        <EventTypesClient initialEventTypes={eventTypes ?? []} bookingStats={bookingStats} availableMembers={teamMembers ?? []} />
      </main>
    </div>
  );
}

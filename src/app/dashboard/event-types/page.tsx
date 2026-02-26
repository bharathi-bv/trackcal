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

  if (!user) redirect("/auth/login");

  const db = createServerClient();
  const [{ data: eventTypes }, { data: hostSettings }] = await Promise.all([
    db.from("event_types").select("*").order("created_at", { ascending: true }),
    db.from("host_settings").select("google_refresh_token").limit(1).maybeSingle(),
  ]);

  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <DashboardNav
        activeTab="event-types"
        calendarConnected={calendarConnected}
        email={user.email ?? ""}
      />

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6)",
        }}
      >
        <EventTypesClient initialEventTypes={eventTypes ?? []} />
      </main>
    </div>
  );
}

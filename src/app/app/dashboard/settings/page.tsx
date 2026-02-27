import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import DashboardNav from "@/components/dashboard/DashboardNav";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const supabaseAuth = await createAuthServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect("/login");

  const db = createServerClient();
  const [{ data: hostSettings }, { data: teamMembers }] = await Promise.all([
    db
      .from("host_settings")
      .select("google_refresh_token, host_name, profile_photo_url, weekly_availability")
      .limit(1)
      .maybeSingle(),
    db
      .from("team_members")
      .select("id, name, email, photo_url, is_active, google_refresh_token, last_booking_at, created_at")
      .order("created_at", { ascending: true }),
  ]);

  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <DashboardNav
        activeTab="settings"
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
        <SettingsClient
          initial={{
            host_name: hostSettings?.host_name ?? null,
            profile_photo_url: hostSettings?.profile_photo_url ?? null,
            weekly_availability: hostSettings?.weekly_availability ?? null,
          }}
          googleAvatarUrl={(user.user_metadata?.avatar_url as string | undefined) ?? null}
          initialTeamMembers={teamMembers ?? []}
          calendarConnected={calendarConnected}
        />
      </main>
    </div>
  );
}

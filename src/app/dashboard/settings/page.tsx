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

  if (!user) redirect("/auth/login");

  const db = createServerClient();
  const { data: hostSettings } = await db
    .from("host_settings")
    .select("google_refresh_token, host_name, profile_photo_url")
    .limit(1)
    .maybeSingle();

  const calendarConnected = Boolean(hostSettings?.google_refresh_token);

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <DashboardNav
        activeTab="settings"
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
        <SettingsClient
          initial={{
            host_name: hostSettings?.host_name ?? null,
            profile_photo_url: hostSettings?.profile_photo_url ?? null,
          }}
        />
      </main>
    </div>
  );
}

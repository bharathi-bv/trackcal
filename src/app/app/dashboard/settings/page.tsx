import { Suspense } from "react";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";
import { ensureHostPublicSlug } from "@/lib/public-booking-links";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const db = createServerClient();
  const userEmailDomain = user?.email ? user.email.split("@")[1]?.toLowerCase() ?? null : null;

  const [hostPublicSlug, { data: hostSettings }, { data: teamMembers }] = await Promise.all([
    ensureHostPublicSlug({
      db,
      hostName: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null,
      email: user?.email ?? null,
    }),
    db
      .from("host_settings")
      .select("host_name, public_slug, profile_photo_url, booking_base_url, booking_base_url_check_status")
      .limit(1)
      .maybeSingle(),
    db
      .from("team_members")
      .select("id, name, email, photo_url, is_active, google_refresh_token, microsoft_refresh_token, last_booking_at, created_at")
      .order("created_at", { ascending: true }),
  ]);

  // Company domain suggestion
  let companyDomainSuggestion: { domain: string; suggestedBy: string } | null = null;
  const currentBookingUrl = (hostSettings as { booking_base_url?: string | null } | null)?.booking_base_url ?? null;
  if (!currentBookingUrl && userEmailDomain && user?.id) {
    const freeProviders = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com", "me.com"]);
    if (!freeProviders.has(userEmailDomain)) {
      try {
        const { data: otherRows } = await db
          .from("host_settings")
          .select("booking_base_url, host_name, user_id")
          .eq("booking_base_url_verified", true)
          .neq("user_id", user.id)
          .limit(5);

        if (otherRows && otherRows.length > 0) {
          const adminClient = createServerClient();
          for (const row of otherRows as { booking_base_url?: string | null; host_name?: string | null; user_id?: string | null }[]) {
            if (!row.user_id || !row.booking_base_url) continue;
            const { data: { user: otherUser } } = await adminClient.auth.admin.getUserById(row.user_id);
            const otherDomain = otherUser?.email?.split("@")[1]?.toLowerCase();
            if (otherDomain === userEmailDomain) {
              companyDomainSuggestion = {
                domain: row.booking_base_url,
                suggestedBy: row.host_name ?? otherUser?.email ?? "a colleague",
              };
              break;
            }
          }
        }
      } catch {
        // Non-critical — skip silently
      }
    }
  }

  return (
    <main className="dashboard-main">
      <Suspense>
        <SettingsClient
          initial={{
            host_name: hostSettings?.host_name ?? null,
            public_slug: hostSettings?.public_slug ?? hostPublicSlug,
            profile_photo_url: hostSettings?.profile_photo_url ?? null,
            booking_base_url: hostSettings?.booking_base_url ?? null,
            booking_base_url_check_status: (hostSettings as { booking_base_url_check_status?: string | null } | null)?.booking_base_url_check_status ?? null,
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
          companyDomainSuggestion={companyDomainSuggestion}
        />
      </Suspense>
    </main>
  );
}

import { Suspense } from "react";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { ensureHostPublicSlug } from "@/lib/public-booking-links";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const db = createServerClient();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? null;
  const userEmailDomain = userEmail ? userEmail.split("@")[1]?.toLowerCase() ?? null : null;

  const [hostPublicSlug, { data: hostSettings }, { data: teamMembers }] = await Promise.all([
    ensureHostPublicSlug({
      db,
      hostName: user?.fullName ?? null,
      email: userEmail,
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
  if (!currentBookingUrl && userEmailDomain && userId) {
    const freeProviders = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com", "me.com"]);
    if (!freeProviders.has(userEmailDomain)) {
      try {
        const { data: otherRows } = await db
          .from("host_settings")
          .select("booking_base_url, host_name, user_id")
          .eq("booking_base_url_verified", true)
          .neq("user_id", userId)
          .limit(5);

        if (otherRows && otherRows.length > 0) {
          const clerk = await clerkClient();
          for (const row of otherRows as { booking_base_url?: string | null; host_name?: string | null; user_id?: string | null }[]) {
            if (!row.user_id || !row.booking_base_url) continue;
            try {
              const otherUser = await clerk.users.getUser(row.user_id);
              const otherDomain = otherUser?.emailAddresses[0]?.emailAddress?.split("@")[1]?.toLowerCase();
              if (otherDomain === userEmailDomain) {
                companyDomainSuggestion = {
                  domain: row.booking_base_url,
                  suggestedBy: row.host_name ?? otherUser?.emailAddresses[0]?.emailAddress ?? "a colleague",
                };
                break;
              }
            } catch {
              // User not found in Clerk — skip
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
            email: userEmail ?? "",
          }}
          googleAvatarUrl={null}
          initialTeamMembers={teamMembers ?? []}
          companyDomainSuggestion={companyDomainSuggestion}
        />
      </Suspense>
    </main>
  );
}

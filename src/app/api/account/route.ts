import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerk = await clerkClient();
  const db = createServerClient();

  // Fetch stored tokens before we delete rows
  // calendar_accounts has no user_id column (single-host table) — fetch all rows
  const [{ data: hostSettings }, { data: calendarAccounts }] = await Promise.all([
    db.from("host_settings").select("microsoft_access_token").eq("user_id", userId).maybeSingle(),
    db.from("calendar_accounts").select("provider, access_token"),
  ]);

  const accounts = (calendarAccounts ?? []) as { provider: string; access_token: string | null }[];

  // Revoke all OAuth tokens in parallel (best-effort — never blocks deletion)
  await Promise.allSettled([
    // Google SSO — via Clerk-managed token
    (async () => {
      const tokens = await clerk.users.getUserOauthAccessToken(userId, "oauth_google");
      const token = tokens.data?.[0]?.token ?? (tokens as unknown as { token?: string }[])[0]?.token ?? null;
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: "POST" });
      }
    })(),

    // Google Calendar tokens stored in calendar_accounts
    ...accounts
      .filter((a) => a.provider === "google" && a.access_token)
      .map((a) =>
        fetch(`https://oauth2.googleapis.com/revoke?token=${a.access_token}`, { method: "POST" })
      ),

    // Microsoft calendar — via token stored in host_settings (legacy)
    (async () => {
      const msToken = (hostSettings as { microsoft_access_token?: string | null } | null)?.microsoft_access_token;
      if (msToken) {
        await fetch("https://graph.microsoft.com/v1.0/me/revokeSignInSessions", {
          method: "POST",
          headers: { Authorization: `Bearer ${msToken}` },
        });
      }
    })(),

    // Microsoft Calendar tokens stored in calendar_accounts
    ...accounts
      .filter((a) => a.provider === "microsoft" && a.access_token)
      .map((a) =>
        fetch("https://graph.microsoft.com/v1.0/me/revokeSignInSessions", {
          method: "POST",
          headers: { Authorization: `Bearer ${a.access_token}` },
        })
      ),

    // Microsoft SSO — if user signed in with a Microsoft account via Clerk
    (async () => {
      const tokens = await clerk.users.getUserOauthAccessToken(userId, "oauth_microsoft");
      const token = tokens.data?.[0]?.token ?? (tokens as unknown as { token?: string }[])[0]?.token ?? null;
      if (token) {
        await fetch("https://graph.microsoft.com/v1.0/me/revokeSignInSessions", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    })(),

  ]);

  // Delete all user data — bookings are intentionally kept
  await Promise.all([
    db.from("host_settings").delete().eq("user_id", userId),
    db.from("event_types").delete().eq("user_id", userId),
    db.from("team_members").delete().eq("user_id", userId),
    db.from("calendar_accounts").delete().neq("id", ""),  // delete all rows (single-host table)
  ]);

  // Delete the Clerk account after external tokens and app data are cleaned up
  await clerk.users.deleteUser(userId);

  return NextResponse.json({ ok: true });
}

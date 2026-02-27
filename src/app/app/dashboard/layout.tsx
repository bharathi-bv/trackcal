/**
 * Dashboard layout — role guard
 *
 * Runs on every /dashboard/** route before the page renders.
 * Redirects team members to their own portal (/member/settings) so they
 * don't accidentally land on the admin dashboard.
 *
 * Admin users pass through normally. Unauthenticated users are redirected
 * to /auth/login (each page also does this individually as a fallback).
 */

import { redirect } from "next/navigation";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If this auth account belongs to a team member, send them to their portal.
  // Admins don't have a team_members row → they go to dashboard normally.
  const db = createServerClient();
  const { data: memberRow } = await db
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberRow) redirect("/app/member/settings");

  return <>{children}</>;
}

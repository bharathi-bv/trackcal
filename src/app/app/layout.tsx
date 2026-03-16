import { createServerClient } from "@/lib/supabase";
import SideNav from "@/components/dashboard/SideNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = createServerClient();
  const { data: hostSettings } = await db
    .from("host_settings")
    .select("profile_photo_url")
    .limit(1)
    .maybeSingle();

  return (
    <div className="app-shell">
      <SideNav initialPhotoUrl={hostSettings?.profile_photo_url ?? null} />
      <div className="app-content">
        {children}
      </div>
    </div>
  );
}

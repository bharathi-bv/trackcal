import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import IntegrationsClient from "@/components/dashboard/IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const db = createServerClient();

  const { data: hostSettings } = await db
    .from("host_settings")
    .select("webhook_urls, zoom_refresh_token, sheet_refresh_token, sheet_id")
    .limit(1)
    .maybeSingle();

  const webhookUrls = Array.isArray((hostSettings as { webhook_urls?: unknown } | null)?.webhook_urls)
    ? ((hostSettings as { webhook_urls?: unknown[] })!.webhook_urls!).filter(
        (v): v is string => typeof v === "string"
      )
    : [];

  return (
    <main className="dashboard-main">
      <Suspense>
        <IntegrationsClient
          zoomConnected={Boolean((hostSettings as { zoom_refresh_token?: string | null } | null)?.zoom_refresh_token)}
          sheetsConnected={Boolean((hostSettings as { sheet_refresh_token?: string | null } | null)?.sheet_refresh_token)}
          initialSheetId={(hostSettings as { sheet_id?: string | null } | null)?.sheet_id ?? null}
          initialWebhookUrls={webhookUrls}
        />
      </Suspense>
    </main>
  );
}

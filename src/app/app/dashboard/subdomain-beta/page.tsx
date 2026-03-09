import { createServerClient } from "@/lib/supabase";
import IntegrationsBaseUrlEditor from "@/components/dashboard/IntegrationsBaseUrlEditor";
import {
  buildPublicBookingUrl,
  ensureHostPublicSlug,
} from "@/lib/public-booking-links";

function normalizeOrigin(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function resolveDnsTargetHost() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "https://citacal.com";
  try {
    const hostname = new URL(raw).hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1") return "citacal.com";
    return hostname;
  } catch {
    return "citacal.com";
  }
}

export default async function SubdomainBetaPage() {
  const db = createServerClient();
  const [
    hostPublicSlug,
    { data: hostSettings },
    { data: firstActiveEvent },
    { count: activeLinksCount },
  ] = await Promise.all([
    ensureHostPublicSlug({ db }),
    db
      .from("host_settings")
      .select(
        "public_slug, booking_base_url, booking_base_url_check_status, booking_base_url_last_checked_at, booking_base_url_verified_at, booking_base_url_check_error"
      )
      .limit(1)
      .maybeSingle(),
    db
      .from("event_types")
      .select("slug")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    db.from("event_types").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const resolvedHostSlug = hostSettings?.public_slug ?? hostPublicSlug;
  const exampleEventSlug = firstActiveEvent?.slug ?? "demo-30min";
  const customBaseUrl = normalizeOrigin(hostSettings?.booking_base_url ?? null);
  const defaultCitacalUrl = buildPublicBookingUrl("https://citacal.com", resolvedHostSlug, exampleEventSlug);
  const effectiveBookingUrl = buildPublicBookingUrl(
    customBaseUrl ?? "https://citacal.com",
    resolvedHostSlug,
    exampleEventSlug
  );
  const customPreviewUrl = `https://book.yourdomain.com/${resolvedHostSlug}/${exampleEventSlug}`;
  const dnsTargetHost = resolveDnsTargetHost();
  const checkStatus = hostSettings?.booking_base_url_check_status;
  const normalizedCheckStatus =
    checkStatus === "verified" || checkStatus === "failed" ? checkStatus : "unchecked";

  return (
    <main
      className="dashboard-main"
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "var(--space-8) var(--space-6)",
        display: "grid",
        gap: "var(--space-6)",
      }}
    >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Subdomain Hosting (Beta)
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
            Choose whether booking links stay on CitaCal or resolve on your own subdomain.
            This page is isolated for testing before we merge it into the main tracking setup.
          </p>
        </div>

        <section className="tc-card" style={{ padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
            Booking Host Mode
          </h2>

          <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Default (CitaCal):</strong>{" "}
              <code>{defaultCitacalUrl}</code>
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Custom subdomain example:</strong>{" "}
              <code>{customPreviewUrl}</code>
            </div>
            <div>
              <strong style={{ color: "var(--text-primary)" }}>Current effective booking URL:</strong>{" "}
              <code>{effectiveBookingUrl}</code>
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              {customBaseUrl
                ? "Custom subdomain mode is enabled."
                : "Default CitaCal mode is enabled. Add and verify a custom base URL below to switch."}
            </div>
          </div>
        </section>

        <section className="tc-card" style={{ padding: "var(--space-6)", display: "grid", gap: "var(--space-3)" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
            Configure and Verify Subdomain
          </h2>
          <IntegrationsBaseUrlEditor
            initialValue={customBaseUrl}
            initialCheckStatus={normalizedCheckStatus}
            initialCheckedAt={hostSettings?.booking_base_url_last_checked_at ?? null}
            initialVerifiedAt={hostSettings?.booking_base_url_verified_at ?? null}
            initialCheckError={hostSettings?.booking_base_url_check_error ?? null}
            hostPublicSlug={resolvedHostSlug}
            exampleEventSlug={exampleEventSlug}
            dnsTargetHost={dnsTargetHost}
          />
        </section>
    </main>
  );
}

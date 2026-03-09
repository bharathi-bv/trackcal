import { createServerClient } from "@/lib/supabase";
import Integrations2Workspace from "@/components/dashboard/Integrations2Workspace";
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

export default async function TrackingPage() {
  const db = createServerClient();

  const [{ data: hostSettings }, { data: allActiveEvents }] =
    await Promise.all([
      db
        .from("host_settings")
        .select(
          "booking_link_header_code, booking_link_footer_code, event_aliases, public_slug, booking_base_url, booking_base_url_check_status, booking_base_url_last_checked_at, booking_base_url_verified_at, booking_base_url_check_error"
        )
        .limit(1)
        .maybeSingle(),
      db
        .from("event_types")
        .select("id, name, slug, duration")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ]);

  const hostPublicSlug =
    (hostSettings as { public_slug?: string | null } | null)?.public_slug ??
    (await ensureHostPublicSlug({ db }));
  const firstSlug = (allActiveEvents ?? [])[0]?.slug ?? "demo-30min";
  const exampleEventSlug = firstSlug;
  const exampleBookingUrl = buildPublicBookingUrl(
    "https://citacal.com",
    hostPublicSlug,
    exampleEventSlug
  );

  // Subdomain data
  const customBaseUrl = normalizeOrigin(
    (hostSettings as { booking_base_url?: string | null } | null)?.booking_base_url ?? null
  );
  const defaultCitacalUrl = buildPublicBookingUrl(
    "https://citacal.com",
    hostPublicSlug,
    exampleEventSlug
  );
  const effectiveBookingUrl = buildPublicBookingUrl(
    customBaseUrl ?? "https://citacal.com",
    hostPublicSlug,
    exampleEventSlug
  );
  const dnsTargetHost = resolveDnsTargetHost();

  const bookingLinks = (allActiveEvents ?? []).map((evt) => ({
    id: evt.id as string,
    name: evt.name as string,
    duration: evt.duration as number,
    url: buildPublicBookingUrl(
      customBaseUrl ?? "https://citacal.com",
      hostPublicSlug,
      evt.slug as string
    ),
  }));
  const rawCheckStatus = (
    hostSettings as { booking_base_url_check_status?: string | null } | null
  )?.booking_base_url_check_status;
  const normalizedCheckStatus: "verified" | "failed" | "unchecked" =
    rawCheckStatus === "verified" || rawCheckStatus === "failed" ? rawCheckStatus : "unchecked";

  return (
    <>
      <Integrations2Workspace
        exampleBookingUrl={exampleBookingUrl}
        bookingLinks={bookingLinks}
        initialHostSettings={{
          bookingLinkHeaderCode:
            (hostSettings as { booking_link_header_code?: string | null } | null)
              ?.booking_link_header_code ?? "",
          bookingLinkFooterCode:
            (hostSettings as { booking_link_footer_code?: string | null } | null)
              ?.booking_link_footer_code ?? "",
          eventAliases:
            (hostSettings as { event_aliases?: Record<string, unknown> | null } | null)
              ?.event_aliases ?? {},
        }}
        subdomainData={{
          customBaseUrl,
          defaultCitacalUrl,
          effectiveBookingUrl,
          customPreviewUrl: `https://book.yourdomain.com/${hostPublicSlug}/${exampleEventSlug}`,
          dnsTargetHost,
          initialCheckStatus: normalizedCheckStatus,
          initialCheckedAt:
            (hostSettings as { booking_base_url_last_checked_at?: string | null } | null)
              ?.booking_base_url_last_checked_at ?? null,
          initialVerifiedAt:
            (hostSettings as { booking_base_url_verified_at?: string | null } | null)
              ?.booking_base_url_verified_at ?? null,
          initialCheckError:
            (hostSettings as { booking_base_url_check_error?: string | null } | null)
              ?.booking_base_url_check_error ?? null,
          hostPublicSlug,
          exampleEventSlug,
        }}
      />
    </>
  );
}

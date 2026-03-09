import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import BookingWizard from "@/components/booking/BookingWizard";
import { createServerClient } from "@/lib/supabase";
import type { CustomQuestion } from "@/lib/event-type-config";
import { normalizeTrackingEventAliases } from "@/lib/tracking-events";

export default async function PublicBookingPageShell({
  hostSlug,
  eventSlug,
  searchParams,
}: {
  hostSlug: string;
  eventSlug: string;
  searchParams?: Record<string, string | string[]>;
}) {
  const db = createServerClient();
  const normalizedHostSlug = hostSlug.trim().toLowerCase();
  const normalizedEventSlug = eventSlug.trim().toLowerCase();

  type HostProfileRow = {
    host_name?: string | null;
    public_slug?: string | null;
    profile_photo_url?: string | null;
    booking_link_header_code?: string | null;
    booking_link_footer_code?: string | null;
    event_aliases?: unknown;
  };

  const [hostSettingsResult, eventTypeResult] = await Promise.all([
    db
      .from("host_settings")
      .select("*")
      .eq("public_slug", normalizedHostSlug)
      .limit(1)
      .maybeSingle(),
    db
      .from("event_types")
      .select("id, name, slug, is_active, duration, description, start_hour, end_hour, slot_increment, custom_questions")
      .eq("slug", normalizedEventSlug)
      .maybeSingle(),
  ]);

  let hostProfile = (hostSettingsResult.data as HostProfileRow | null) ?? null;
  let eventType = eventTypeResult.data;

  // Local/dev fallback: if public_slug mismatches, use the first host row.
  if (!hostProfile) {
    const fallbackHost = await db
      .from("host_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    hostProfile = (fallbackHost.data as HostProfileRow | null) ?? null;
  }

  // Local/dev fallback: if slug exists but inactive, render it to avoid hard 404 while debugging.
  if (!eventType && process.env.NODE_ENV !== "production") {
    const fallbackEvent = await db
      .from("event_types")
      .select("id, name, slug, is_active, duration, description, start_hour, end_hour, slot_increment, custom_questions")
      .eq("slug", normalizedEventSlug)
      .maybeSingle();
    eventType = fallbackEvent.data ?? null;
  }

  // Custom domain redirect — if host has a verified custom domain and this
  // request arrived on a different host (e.g. citacal.com), redirect there,
  // preserving all query params (UTMs, click IDs, etc.).
  const hostRow = hostProfile as {
    booking_base_url?: string | null;
    booking_base_url_verified?: boolean | null;
  } | null;
  if (hostRow?.booking_base_url_verified && hostRow.booking_base_url) {
    try {
      const customHostname = new URL(hostRow.booking_base_url).hostname;
      const headersList = await headers();
      const requestHost = (headersList.get("host") ?? "").split(":")[0];
      if (requestHost && requestHost !== customHostname) {
        const base = hostRow.booking_base_url.replace(/\/+$/, "");
        const qs =
          searchParams && Object.keys(searchParams).length > 0
            ? "?" +
              new URLSearchParams(
                Object.entries(searchParams).flatMap(([k, v]) =>
                  Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]]
                )
              ).toString()
            : "";
        redirect(`${base}/${normalizedHostSlug}/${normalizedEventSlug}${qs}`);
      }
    } catch {
      // Malformed booking_base_url — skip redirect, render normally
    }
  }

  if (!hostProfile || !eventType) {
    console.warn("[public-booking] not found", {
      hostSlug: normalizedHostSlug,
      eventSlug: normalizedEventSlug,
      hostFound: Boolean(hostProfile),
      eventFound: Boolean(eventType),
      hostError: hostSettingsResult.error?.message ?? null,
      eventError: eventTypeResult.error?.message ?? null,
    });
    notFound();
  }

  if ((eventType as { is_active?: boolean | null }).is_active === false) {
    console.info("[public-booking] rendering inactive event slug", {
      hostSlug: normalizedHostSlug,
      eventSlug: normalizedEventSlug,
    });
  }

  const bookingLinkHeaderCode =
    typeof hostProfile?.booking_link_header_code === "string"
      ? hostProfile.booking_link_header_code
      : "";
  const bookingLinkFooterCode =
    typeof hostProfile?.booking_link_footer_code === "string"
      ? hostProfile.booking_link_footer_code
      : "";
  const eventAliases = normalizeTrackingEventAliases(hostProfile?.event_aliases ?? {});
  const customQuestions: CustomQuestion[] = Array.isArray(eventType?.custom_questions)
    ? (eventType.custom_questions as CustomQuestion[])
    : [];

  return (
    <>
      {bookingLinkHeaderCode.trim().length > 0 ? (
        <div dangerouslySetInnerHTML={{ __html: bookingLinkHeaderCode }} />
      ) : null}
      <main
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{ background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)" }}
      >
        <BookingWizard
          eventType={eventType ?? undefined}
          hostProfile={
            hostProfile
              ? {
                  host_name: hostProfile.host_name ?? null,
                  profile_photo_url: hostProfile.profile_photo_url ?? null,
                }
              : undefined
          }
          customQuestions={customQuestions}
          trackingConfig={{ eventAliases }}
        />
      </main>
      {bookingLinkFooterCode.trim().length > 0 ? (
        <div dangerouslySetInnerHTML={{ __html: bookingLinkFooterCode }} />
      ) : null}
    </>
  );
}

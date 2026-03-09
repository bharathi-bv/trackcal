import { lookup } from "dns/promises";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

const verifySchema = z.object({
  booking_base_url: z.string().trim().url().optional().nullable(),
  host_slug: z.string().trim().max(64).optional().nullable(),
  event_slug: z.string().trim().max(128).optional().nullable(),
});

type ProbeResult = {
  reachable: boolean;
  ok: boolean;
  status: number | null;
  error: string | null;
};

function normalizeBookingBaseUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function normalizeSlugSegment(value: string | null | undefined) {
  if (!value?.trim()) return "";
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

async function probeHttps(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html,*/*",
      },
      cache: "no-store",
    });
    return {
      reachable: true,
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "network_error";
    return {
      reachable: false,
      ok: false,
      status: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const db = createServerClient();
  const { data: hostSettings } = await db
    .from("host_settings")
    .select("id, booking_base_url, public_slug")
    .limit(1)
    .maybeSingle();

  const hostSettingsRow = hostSettings as
    | { id: string; booking_base_url?: string | null; public_slug?: string | null }
    | null;

  if (!hostSettingsRow?.id) {
    return NextResponse.json({ error: "Host settings not found." }, { status: 400 });
  }

  const bookingBaseUrl = normalizeBookingBaseUrl(
    parsed.data.booking_base_url ?? hostSettingsRow.booking_base_url ?? null
  );
  if (!bookingBaseUrl) {
    return NextResponse.json(
      { error: "Set a valid booking base URL before verification." },
      { status: 400 }
    );
  }

  const hostname = new URL(bookingBaseUrl).hostname;
  const hostSlug = normalizeSlugSegment(parsed.data.host_slug ?? hostSettingsRow.public_slug ?? "");
  const eventSlug = normalizeSlugSegment(parsed.data.event_slug ?? "");
  const checkedAt = new Date().toISOString();

  let resolvedIp: string | null = null;
  let dnsError: string | null = null;
  try {
    const dnsLookup = await lookup(hostname);
    resolvedIp = dnsLookup.address;
  } catch (error) {
    dnsError = error instanceof Error ? error.message : "dns_lookup_failed";
  }

  const rootProbe = await probeHttps(`${bookingBaseUrl}/`);
  let bookingProbe: ProbeResult | null = null;
  let bookingUrl: string | null = null;

  if (hostSlug && eventSlug) {
    bookingUrl = `${bookingBaseUrl}/${encodeURIComponent(hostSlug)}/${encodeURIComponent(eventSlug)}`;
    bookingProbe = await probeHttps(bookingUrl);
  }

  const verified = Boolean(
    resolvedIp &&
      rootProbe.reachable &&
      (!bookingProbe || bookingProbe.ok)
  );

  let checkError: string | null = null;
  if (!resolvedIp) {
    checkError = `DNS lookup failed for ${hostname}${dnsError ? ` (${dnsError})` : ""}.`;
  } else if (!rootProbe.reachable) {
    checkError = `Could not establish HTTPS connection to ${bookingBaseUrl}.`;
  } else if (bookingProbe && !bookingProbe.ok) {
    checkError = `Domain resolved, but booking URL check failed (HTTP ${bookingProbe.status ?? "unknown"}) for ${bookingUrl}.`;
  }

  const updatePayload = {
    booking_base_url: bookingBaseUrl,
    booking_base_url_verified: verified,
    booking_base_url_verified_at: verified ? checkedAt : null,
    booking_base_url_last_checked_at: checkedAt,
    booking_base_url_check_status: verified ? "verified" : "failed",
    booking_base_url_check_error: checkError,
  };

  const { error: updateError } = await db
    .from("host_settings")
    .update(updatePayload)
    .eq("id", hostSettingsRow.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: verified,
    booking_base_url: bookingBaseUrl,
    verification: {
      status: verified ? "verified" : "failed",
      checked_at: checkedAt,
      verified_at: verified ? checkedAt : null,
      error: checkError,
      checks: {
        dns: {
          hostname,
          resolved: Boolean(resolvedIp),
          ip: resolvedIp,
          error: dnsError,
        },
        https: {
          reachable: rootProbe.reachable,
          status: rootProbe.status,
          error: rootProbe.error,
        },
        booking_url: bookingUrl
          ? {
              url: bookingUrl,
              ok: Boolean(bookingProbe?.ok),
              status: bookingProbe?.status ?? null,
              error: bookingProbe?.error ?? null,
            }
          : null,
      },
    },
  });
}

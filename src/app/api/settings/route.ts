/**
 * GET /api/settings  — returns host_name + profile_photo_url + weekly_availability
 * PUT /api/settings  — upserts host_name + profile_photo_url + weekly_availability
 *
 * Uses the service_role client so it bypasses RLS (same as all other API routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { z } from "zod";
import {
  isHostPublicSlugAvailable,
  slugifyPublicSegment,
} from "@/lib/public-booking-links";
import { normalizeTrackingEventAliases } from "@/lib/tracking-events";
import { addDomainToVercel, removeDomainFromVercel } from "@/lib/vercel-domains";

const settingsSchema = z.object({
  host_name: z.string().trim().max(120).optional().nullable(),
  public_slug: z.string().trim().max(48).optional().nullable(),
  // Allow full URLs, data: URIs (file-upload base64), or empty string
  profile_photo_url: z.string().trim().max(500000).optional().or(z.literal("")).nullable(),
  booking_base_url: z.string().trim().url().optional().or(z.literal("")).nullable(),
  weekly_availability: z.record(z.string(), z.any()).optional().nullable(),
  webhook_urls: z.array(z.string().url()).optional().nullable(),
  booking_link_header_code: z.string().max(200000).optional().or(z.literal("")).nullable(),
  booking_link_footer_code: z.string().max(200000).optional().or(z.literal("")).nullable(),
  booking_link_script_urls: z.array(z.string().trim().url().max(2048)).optional().nullable(),
  event_aliases: z.record(z.string(), z.string()).optional().nullable(),
  embed_send_pageview: z.boolean().optional(),
  google_analytics_id: z.string().trim().max(64).optional().nullable(),
  google_tag_manager_id: z.string().trim().max(64).optional().nullable(),
  meta_pixel_id: z.string().trim().max(64).optional().nullable(),
  linkedin_partner_id: z.string().trim().max(64).optional().nullable(),
  google_calendar_ids: z.array(z.string().trim().min(1)).optional().nullable(),
  microsoft_calendar_ids: z.array(z.string().trim().min(1)).optional().nullable(),
  // When true, clears all connected host calendar tokens
  disconnect_calendar: z.boolean().optional(),
  // When true, clears only Google calendar tokens
  disconnect_google: z.boolean().optional(),
  // When true, clears only Microsoft calendar tokens
  disconnect_microsoft: z.boolean().optional(),
  // Set which provider events are written to
  write_calendar_provider: z.enum(["google", "microsoft"]).optional(),
  // When true, clears Zoom tokens
  disconnect_zoom: z.boolean().optional(),
  // Google Sheets: save sheet_id from the URL the user pasted
  sheet_id: z.string().optional().nullable(),
  // When true, clears Sheets tokens + sheet_id
  disconnect_sheets: z.boolean().optional(),
});

function normalizeBookingBaseUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function normalizeAnalyticsId(value: string | null | undefined, kind: "ga" | "gtm") {
  if (!value?.trim()) return null;
  const normalized = value.trim().toUpperCase();
  if (kind === "ga") {
    return /^G-[A-Z0-9]+$/.test(normalized) ? normalized : null;
  }
  return /^GTM-[A-Z0-9]+$/.test(normalized) ? normalized : null;
}

function normalizeNumericAnalyticsId(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function normalizeScriptUrls(values: string[] | null | undefined) {
  if (!values) return [] as string[];
  const deduped = new Set<string>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    deduped.add(trimmed);
  }
  return Array.from(deduped);
}

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("host_name, public_slug, profile_photo_url, booking_base_url, booking_base_url_verified, booking_base_url_verified_at, booking_base_url_last_checked_at, booking_base_url_check_status, booking_base_url_check_error, weekly_availability, webhook_urls, booking_link_header_code, booking_link_footer_code, booking_link_script_urls, event_aliases, embed_send_pageview, google_analytics_id, google_tag_manager_id, meta_pixel_id, linkedin_partner_id, calendar_provider, google_calendar_ids, microsoft_calendar_ids, zoom_refresh_token, sheet_refresh_token, sheet_id")
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = data as any;

  return NextResponse.json({
    settings: settings
      ? {
          host_name: settings.host_name,
          public_slug: settings.public_slug,
          profile_photo_url: settings.profile_photo_url,
          booking_base_url: settings.booking_base_url,
          booking_base_url_verified: Boolean(settings.booking_base_url_verified),
          booking_base_url_verified_at: settings.booking_base_url_verified_at ?? null,
          booking_base_url_last_checked_at: settings.booking_base_url_last_checked_at ?? null,
          booking_base_url_check_status: settings.booking_base_url_check_status ?? "unchecked",
          booking_base_url_check_error: settings.booking_base_url_check_error ?? null,
          weekly_availability: settings.weekly_availability,
          webhook_urls: settings.webhook_urls,
          booking_link_header_code: settings.booking_link_header_code ?? "",
          booking_link_footer_code: settings.booking_link_footer_code ?? "",
          booking_link_script_urls: settings.booking_link_script_urls ?? [],
          event_aliases: normalizeTrackingEventAliases(settings.event_aliases ?? {}),
          embed_send_pageview: Boolean(settings.embed_send_pageview),
          google_analytics_id: settings.google_analytics_id,
          google_tag_manager_id: settings.google_tag_manager_id,
          meta_pixel_id: settings.meta_pixel_id,
          linkedin_partner_id: settings.linkedin_partner_id,
          calendar_provider: settings.calendar_provider,
          google_calendar_ids: settings.google_calendar_ids ?? [],
          microsoft_calendar_ids: settings.microsoft_calendar_ids ?? [],
          zoom_connected: Boolean(settings.zoom_refresh_token),
          sheets_connected: Boolean(settings.sheet_refresh_token),
          sheet_id: settings.sheet_id ?? null,
        }
      : {
          host_name: null,
          public_slug: null,
          profile_photo_url: null,
          booking_base_url: null,
          booking_base_url_verified: false,
          booking_base_url_verified_at: null,
          booking_base_url_last_checked_at: null,
          booking_base_url_check_status: "unchecked",
          booking_base_url_check_error: null,
          weekly_availability: null,
          webhook_urls: [],
          booking_link_header_code: "",
          booking_link_footer_code: "",
          booking_link_script_urls: [],
          event_aliases: {},
          embed_send_pageview: false,
          google_analytics_id: null,
          google_tag_manager_id: null,
          meta_pixel_id: null,
          linkedin_partner_id: null,
          calendar_provider: null,
          google_calendar_ids: [],
          microsoft_calendar_ids: [],
          zoom_connected: false,
          sheets_connected: false,
          sheet_id: null,
        },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, unauthorized } = await requireApiUser();
    if (unauthorized) return unauthorized;

    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const host_name = parsed.data.host_name || null;
    const public_slug =
      parsed.data.public_slug === undefined || parsed.data.public_slug === null
        ? undefined
        : slugifyPublicSegment(parsed.data.public_slug);
    const profile_photo_url = parsed.data.profile_photo_url || null;
    const booking_base_url = normalizeBookingBaseUrl(parsed.data.booking_base_url);
    const weekly_availability = parsed.data.weekly_availability ?? undefined;
    const webhook_urls = parsed.data.webhook_urls ?? undefined;
    const booking_link_header_code =
      parsed.data.booking_link_header_code === undefined
        ? undefined
        : (parsed.data.booking_link_header_code ?? "");
    const booking_link_footer_code =
      parsed.data.booking_link_footer_code === undefined
        ? undefined
        : (parsed.data.booking_link_footer_code ?? "");
    const booking_link_script_urls =
      parsed.data.booking_link_script_urls === undefined
        ? undefined
        : normalizeScriptUrls(parsed.data.booking_link_script_urls);
    const event_aliases =
      parsed.data.event_aliases === undefined
        ? undefined
        : normalizeTrackingEventAliases(parsed.data.event_aliases);
    const embed_send_pageview = parsed.data.embed_send_pageview;
    const google_analytics_id =
      parsed.data.google_analytics_id === undefined
        ? undefined
        : normalizeAnalyticsId(parsed.data.google_analytics_id, "ga");
    const google_tag_manager_id =
      parsed.data.google_tag_manager_id === undefined
        ? undefined
        : normalizeAnalyticsId(parsed.data.google_tag_manager_id, "gtm");
    const meta_pixel_id =
      parsed.data.meta_pixel_id === undefined
        ? undefined
        : normalizeNumericAnalyticsId(parsed.data.meta_pixel_id);
    const linkedin_partner_id =
      parsed.data.linkedin_partner_id === undefined
        ? undefined
        : normalizeNumericAnalyticsId(parsed.data.linkedin_partner_id);

    const db = createServerClient();

    // Check if a row already exists
    const { data: existing } = await db
      .from("host_settings")
      .select("id, booking_base_url")
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      host_name: host_name || null,
      profile_photo_url: profile_photo_url || null,
      user_id: userId!,
    };
    if (parsed.data.public_slug !== undefined) {
      if (!public_slug) {
        return NextResponse.json(
          { error: "Public username can only contain lowercase letters, numbers, and hyphens." },
          { status: 400 }
        );
      }
      const slugAvailability = await isHostPublicSlugAvailable({ slug: public_slug, db });
      if (!slugAvailability.available) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      payload.public_slug = public_slug;
    }
    let vercelDnsInfo: { recordType?: string; dnsTarget?: string } = {};
    if (parsed.data.booking_base_url !== undefined) {
      payload.booking_base_url = booking_base_url;
      const existingBaseUrl = normalizeBookingBaseUrl((existing as { booking_base_url?: string | null } | null)?.booking_base_url);
      if (existingBaseUrl !== booking_base_url) {
        payload.booking_base_url_verified = false;
        payload.booking_base_url_verified_at = null;
        payload.booking_base_url_last_checked_at = null;
        payload.booking_base_url_check_status = "unchecked";
        payload.booking_base_url_check_error = null;

        // Register / deregister the domain on Vercel automatically
        if (booking_base_url) {
          const hostname = new URL(booking_base_url).hostname;
          const result = await addDomainToVercel(hostname);
          if (result.ok) {
            vercelDnsInfo = { recordType: result.recordType, dnsTarget: result.dnsTarget };
          }
        } else if (existingBaseUrl) {
          const hostname = new URL(existingBaseUrl).hostname;
          await removeDomainFromVercel(hostname);
        }
      }
    }
    // Only include weekly_availability in the update if it was explicitly sent
    if (weekly_availability !== undefined) {
      payload.weekly_availability = weekly_availability;
    }
    if (webhook_urls !== undefined) {
      payload.webhook_urls = webhook_urls ?? [];
    }
    if (booking_link_header_code !== undefined) {
      payload.booking_link_header_code = booking_link_header_code;
    }
    if (booking_link_footer_code !== undefined) {
      payload.booking_link_footer_code = booking_link_footer_code;
    }
    if (booking_link_script_urls !== undefined) {
      payload.booking_link_script_urls = booking_link_script_urls;
    }
    if (event_aliases !== undefined) {
      payload.event_aliases = event_aliases;
    }
    if (embed_send_pageview !== undefined) {
      payload.embed_send_pageview = Boolean(embed_send_pageview);
    }
    if (parsed.data.google_analytics_id !== undefined) {
      if (parsed.data.google_analytics_id && !google_analytics_id) {
        return NextResponse.json({ error: "Google Analytics ID must look like G-XXXXXXX." }, { status: 400 });
      }
      payload.google_analytics_id = google_analytics_id;
    }
    if (parsed.data.google_tag_manager_id !== undefined) {
      if (parsed.data.google_tag_manager_id && !google_tag_manager_id) {
        return NextResponse.json({ error: "Google Tag Manager ID must look like GTM-XXXXXXX." }, { status: 400 });
      }
      payload.google_tag_manager_id = google_tag_manager_id;
    }
    if (parsed.data.meta_pixel_id !== undefined) {
      if (parsed.data.meta_pixel_id && !meta_pixel_id) {
        return NextResponse.json({ error: "Meta Pixel ID must be numeric." }, { status: 400 });
      }
      payload.meta_pixel_id = meta_pixel_id;
    }
    if (parsed.data.linkedin_partner_id !== undefined) {
      if (parsed.data.linkedin_partner_id && !linkedin_partner_id) {
        return NextResponse.json({ error: "LinkedIn Partner ID must be numeric." }, { status: 400 });
      }
      payload.linkedin_partner_id = linkedin_partner_id;
    }
    if (parsed.data.google_calendar_ids !== undefined) {
      payload.google_calendar_ids = parsed.data.google_calendar_ids ?? [];
    }
    if (parsed.data.microsoft_calendar_ids !== undefined) {
      payload.microsoft_calendar_ids = parsed.data.microsoft_calendar_ids ?? [];
    }
    // Clear all host calendar tokens if disconnect requested
    if (parsed.data.disconnect_calendar === true) {
      payload.google_access_token = null;
      payload.google_refresh_token = null;
      payload.google_token_expiry = null;
      payload.google_calendar_ids = [];
      payload.microsoft_access_token = null;
      payload.microsoft_refresh_token = null;
      payload.microsoft_token_expiry = null;
      payload.microsoft_calendar_ids = [];
      payload.calendar_provider = null;
    }
    if (parsed.data.disconnect_google === true) {
      payload.google_access_token = null;
      payload.google_refresh_token = null;
      payload.google_token_expiry = null;
      payload.google_calendar_ids = [];
      // If google was the write provider, switch to microsoft (or null)
      if (!payload.calendar_provider) payload.calendar_provider = "microsoft";
    }
    if (parsed.data.disconnect_microsoft === true) {
      payload.microsoft_access_token = null;
      payload.microsoft_refresh_token = null;
      payload.microsoft_token_expiry = null;
      payload.microsoft_calendar_ids = [];
      if (!payload.calendar_provider) payload.calendar_provider = "google";
    }
    if (parsed.data.write_calendar_provider !== undefined) {
      payload.calendar_provider = parsed.data.write_calendar_provider;
    }

    // Clear Zoom tokens if disconnect requested
    if (parsed.data.disconnect_zoom === true) {
      const db2 = createServerClient();
      const { data: existingRow } = await db2.from("host_settings").select("id").limit(1).maybeSingle();
      if (existingRow) {
        await db2.from("host_settings").update({
          zoom_access_token: null,
          zoom_refresh_token: null,
          zoom_token_expiry: null,
          zoom_user_id: null,
        }).eq("id", existingRow.id);
      }
      return NextResponse.json({ ok: true });
    }

    // Save sheet_id if provided
    if (parsed.data.sheet_id !== undefined) {
      payload.sheet_id = parsed.data.sheet_id || null;
    }

    // Clear Sheets tokens if disconnect requested
    if (parsed.data.disconnect_sheets === true) {
      const db2 = createServerClient();
      const { data: existingRow } = await db2.from("host_settings").select("id").limit(1).maybeSingle();
      if (existingRow) {
        await db2.from("host_settings").update({
          sheet_access_token: null,
          sheet_refresh_token: null,
          sheet_token_expiry: null,
          sheet_id: null,
        }).eq("id", existingRow.id);
      }
      return NextResponse.json({ ok: true });
    }

    let error;
    if (existing) {
      ({ error } = await db
        .from("host_settings")
        .update(payload)
        .eq("id", existing.id));
    } else {
      ({ error } = await db.from("host_settings").insert(payload));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...vercelDnsInfo });
  } catch (err) {
    console.error("[settings] PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

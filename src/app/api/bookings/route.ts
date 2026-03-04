/**
 * /api/bookings
 *
 * POST — Create a booking. Called from BookingWizard when user confirms.
 *        Receives booking details + all UTM/click-ID params, saves to Supabase.
 *        Implements round-robin: if the event type has assigned_member_ids,
 *        picks the least-recently-booked free member and assigns the booking.
 *
 * GET  — List all bookings. Powers the attribution dashboard.
 *
 * Uses the server client (service_role key) so it bypasses RLS.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  createMemberCalendarEvent,
  isMemberCalendarFreeAtSlot,
  type MemberCalendarConnection,
} from "@/lib/member-calendar";
import { createHostCalendarEvent } from "@/lib/host-calendar";
import { isZoomConnected, createZoomMeeting } from "@/lib/zoom";
import { requireApiUser } from "@/lib/api-auth";
import { sendBookingConfirmedWebhooks } from "@/lib/webhooks";
import { appendRow } from "@/lib/google-sheets";
import {
  sendBookingConfirmationToAttendee,
  sendBookingNotificationToHost,
} from "@/lib/email";
import {
  appendBookingActionLinks,
  buildBookingActionUrls,
  createManageToken,
  resolvePublicBaseUrl,
} from "@/lib/booking-manage";
import {
  findSlotMeta,
  getSelectedTeamMembers,
  getTeamAvailability,
  type TeamSchedulingMode,
} from "@/lib/team-scheduling";

const DEFAULT_MAX_BOOKINGS_PER_IP_PER_HOUR = 20;
const DEFAULT_MAX_BOOKINGS_PER_EMAIL_PER_DAY = 8;
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "sharklasers.com",
  "dispostable.com",
  "maildrop.cc",
]);

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function envBool(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function getSourceIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp ? realIp.slice(0, 128) : null;
}

function normalizeEmail(input: unknown) {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

function parseEmailDomain(email: string) {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

function getBlockedEmailDomains() {
  const fromEnv = (process.env.CITACAL_BLOCKED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const blocked = new Set(fromEnv);
  if (envBool("CITACAL_BLOCK_DISPOSABLE_EMAILS", true)) {
    DISPOSABLE_EMAIL_DOMAINS.forEach((d) => blocked.add(d));
  }
  return blocked;
}

// ── POST /api/bookings ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  const startedAt = Date.now();
  const respond = (
    body: Record<string, unknown>,
    status: number,
    meta: Record<string, unknown> = {}
  ) => {
    const durationMs = Date.now() - startedAt;
    console.info("[bookings] POST", { status, duration_ms: durationMs, ...meta });
    return NextResponse.json(body, {
      status,
      headers: { "x-citacal-duration-ms": String(durationMs) },
    });
  };

  try {
    const body = await request.json();
    const stageMs: Record<string, number> = {};

    const {
      date,
      time,
      name,
      email,
      phone,
      notes,
      website,
      event_slug,
      custom_answers,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      gclid,
      li_fat_id,
      fbclid,
      ttclid,
      msclkid,
    } = body;

    if (!date || !time || !name || !email) {
      return respond(
        { error: "Missing required fields: date, time, name, email" },
        400,
        { reason: "missing_required_fields" }
      );
    }

    // Honeypot trap: pretend success but do not create booking.
    if (typeof website === "string" && website.trim().length > 0) {
      return respond({ id: null, ignored: true }, 201, { reason: "honeypot_triggered" });
    }

    const db = createServerClient();
    const sourceIp = getSourceIp(request);
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 512) || null;
    const normalizedName = String(name).trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone =
      typeof phone === "string" && phone.trim().length > 0 ? phone.trim().slice(0, 64) : null;
    const normalizedNotes =
      typeof notes === "string" && notes.trim().length > 0 ? notes.trim().slice(0, 2000) : null;

    const blockedDomains = getBlockedEmailDomains();
    const emailDomain = parseEmailDomain(normalizedEmail);
    if (!normalizedName || !emailDomain) {
      return respond(
        { error: "Please provide a valid name and email." },
        400,
        { reason: "invalid_name_or_email" }
      );
    }
    if (emailDomain && blockedDomains.has(emailDomain)) {
      return respond(
        { error: "Please use a valid email address." },
        400,
        { reason: "blocked_email_domain", email_domain: emailDomain }
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const maxByIp = envNumber("CITACAL_MAX_BOOKINGS_PER_IP_PER_HOUR", DEFAULT_MAX_BOOKINGS_PER_IP_PER_HOUR);
    const maxByEmail = envNumber(
      "CITACAL_MAX_BOOKINGS_PER_EMAIL_PER_DAY",
      DEFAULT_MAX_BOOKINGS_PER_EMAIL_PER_DAY
    );

    if (sourceIp && maxByIp > 0) {
      const ipRateQuery = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("source_ip", sourceIp)
        .gte("created_at", oneHourAgo);
      if (ipRateQuery.error) {
        if (ipRateQuery.error.code === "42703" || ipRateQuery.error.message.includes("source_ip")) {
          console.warn("[bookings] source_ip column missing; skipping IP rate limit");
        } else {
          throw ipRateQuery.error;
        }
      } else if ((ipRateQuery.count ?? 0) >= maxByIp) {
        return respond(
          { error: "Too many booking attempts. Please try again later." },
          429,
          { reason: "rate_limited_ip" }
        );
      }
    }

    if (maxByEmail > 0) {
      const { count: emailRecentCount } = await db
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("email", normalizedEmail)
        .gte("created_at", oneDayAgo);
      if ((emailRecentCount ?? 0) >= maxByEmail) {
        return respond(
          { error: "Too many bookings from this email in the last 24 hours." },
          429,
          { reason: "rate_limited_email" }
        );
      }
    }

    const { count: duplicateCount } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .eq("time", time)
      .in("status", ["confirmed", "pending"])
      .eq("email", normalizedEmail);
    if ((duplicateCount ?? 0) > 0) {
      return respond(
        { error: "You already have a booking for this slot." },
        409,
        { reason: "duplicate_booking_same_slot" }
      );
    }

    // ── Look up event type settings ──────────────────────────────────────────
    let durationMinutes = 30;
    let eventName = "Discovery Call";
    let titleTemplate: string | null = null;
    let eventDescription: string | null = null;
    let locationType: string | null = null;
    let locationValue: string | null = null;
    let assignedMemberIds: string[] = [];
    let teamSchedulingMode: TeamSchedulingMode = "round_robin";
    let collectiveRequiredMemberIds: string[] = [];
    let collectiveShowAvailabilityTiers = false;
    let collectiveMinAvailableHosts: number | null = null;
    let scheduleStartHour = 9;
    let scheduleEndHour = 17;
    let scheduleSlotIncrement = 30;
    let scheduleMinNoticeHours = 0;
    let scheduleMaxDaysInAdvance = 60;
    let scheduleBufferBeforeMinutes = 0;
    let scheduleBufferAfterMinutes = 0;

    if (event_slug) {
      const { data: et } = await db
        .from("event_types")
        .select(
          "duration, name, title_template, description, location_type, location_value, assigned_member_ids, team_scheduling_mode, collective_required_member_ids, collective_show_availability_tiers, collective_min_available_hosts, start_hour, end_hour, slot_increment, min_notice_hours, max_days_in_advance, buffer_before_minutes, buffer_after_minutes"
        )
        .eq("slug", event_slug)
        .maybeSingle();
      if (et) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const etAny = et as any;
        durationMinutes = etAny.duration;
        eventName = etAny.name ?? eventName;
        titleTemplate = etAny.title_template ?? null;
        eventDescription = etAny.description ?? null;
        locationType = etAny.location_type ?? null;
        locationValue = etAny.location_value ?? null;
        assignedMemberIds = Array.isArray(etAny.assigned_member_ids)
          ? etAny.assigned_member_ids
          : [];
        teamSchedulingMode = etAny.team_scheduling_mode ?? "round_robin";
        collectiveRequiredMemberIds = Array.isArray(etAny.collective_required_member_ids)
          ? etAny.collective_required_member_ids
          : [];
        collectiveShowAvailabilityTiers = Boolean(etAny.collective_show_availability_tiers);
        collectiveMinAvailableHosts =
          typeof etAny.collective_min_available_hosts === "number"
            ? etAny.collective_min_available_hosts
            : null;
        scheduleStartHour = etAny.start_hour ?? scheduleStartHour;
        scheduleEndHour = etAny.end_hour ?? scheduleEndHour;
        scheduleSlotIncrement = etAny.slot_increment ?? scheduleSlotIncrement;
        scheduleMinNoticeHours = etAny.min_notice_hours ?? scheduleMinNoticeHours;
        scheduleMaxDaysInAdvance = etAny.max_days_in_advance ?? scheduleMaxDaysInAdvance;
        scheduleBufferBeforeMinutes =
          etAny.buffer_before_minutes ?? scheduleBufferBeforeMinutes;
        scheduleBufferAfterMinutes =
          etAny.buffer_after_minutes ?? scheduleBufferAfterMinutes;
      }
    }
    stageMs.event_type_lookup = Date.now() - startedAt;

    const [{ data: host }, { data: { users: authUsers } = { users: [] } }] = await Promise.all([
      db.from("host_settings").select("host_name, webhook_urls, booking_base_url").limit(1).maybeSingle(),
      db.auth.admin.listUsers({ perPage: 1 }).catch(() => ({ data: { users: [] } })),
    ]);
    stageMs.host_settings_lookup = Date.now() - startedAt;
    const hostName = host?.host_name?.trim() || "CitaCal Host";
    const hostEmail: string | null =
      (authUsers as Array<{ email?: string }>)[0]?.email ?? null;

    const summary = titleTemplate
      ? titleTemplate
          .replaceAll("{event_name}", eventName)
          .replaceAll("{invitee_name}", normalizedName)
          .replaceAll("{host_name}", hostName)
      : `${eventName} with ${normalizedName}`;

    let location: string | undefined;
    let zoomMeetingId: string | null = null;

    if (locationType === "zoom") {
      try {
        if (await isZoomConnected()) {
          // Parse time like "09:30 AM" to build ISO start time for Zoom API
          const [h12str, period] = time.split(" ");
          const [hh, mm] = h12str.split(":").map(Number);
          let hour = hh;
          if (period === "PM" && hh !== 12) hour += 12;
          if (period === "AM" && hh === 12) hour = 0;
          const zoomStart = new Date(
            `${date}T${String(hour).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`
          ).toISOString();

          const meeting = await createZoomMeeting({
            topic: summary,
            start_time: zoomStart,
            duration: durationMinutes,
          });
          zoomMeetingId = meeting.id;
          location = meeting.join_url;
        } else {
          location = locationValue || undefined;
        }
      } catch (zoomErr) {
        console.error("[bookings] Zoom meeting creation failed:", zoomErr);
        location = locationValue || undefined;
      }
    } else if (locationType === "custom" || locationType === "phone") {
      location = locationValue || undefined;
    }

    const description = [
      eventDescription,
      `Attendee: ${normalizedName} <${normalizedEmail}>`,
      normalizedNotes ? `Notes: ${normalizedNotes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    // ── Round-robin: pick the least-recently-booked free member ─────────────
    // If the event type has no assigned members, assignedMemberId stays null
    // and the booking falls back to the single-host calendar.
    let assignedMemberId: string | null = null;
    let assignedHostIds: string[] = [];
    let assignedHosts:
      | Array<{
          id: string;
          name: string;
          photo_url: string | null;
          google_access_token: string | null;
          google_refresh_token: string | null;
          google_token_expiry: string | null;
          google_calendar_ids?: string[] | null;
          microsoft_access_token?: string | null;
          microsoft_refresh_token?: string | null;
          microsoft_token_expiry?: string | null;
          microsoft_calendar_ids?: string[] | null;
        }>
      | null = null;

    if (assignedMemberIds.length > 0) {
      if (teamSchedulingMode === "collective") {
        const collectiveAvailability = await getTeamAvailability({
          date,
          settings: {
            duration: durationMinutes,
            start_hour: scheduleStartHour,
            end_hour: scheduleEndHour,
            slot_increment: scheduleSlotIncrement,
            min_notice_hours: scheduleMinNoticeHours,
            max_days_in_advance: scheduleMaxDaysInAdvance,
            buffer_before_minutes: scheduleBufferBeforeMinutes,
            buffer_after_minutes: scheduleBufferAfterMinutes,
          },
          memberIds: assignedMemberIds,
          mode: teamSchedulingMode,
          requiredMemberIds: collectiveRequiredMemberIds,
          fallbackMinimumHostCount: collectiveMinAvailableHosts,
          showAvailabilityTiers: collectiveShowAvailabilityTiers,
          db,
        });

        const selectedSlot = findSlotMeta(collectiveAvailability.slotMeta, time);
        if (!selectedSlot) {
          return respond(
            { error: "That group slot is no longer available." },
            409,
            { reason: "collective_slot_unavailable" }
          );
        }

        const collectiveHosts = await getSelectedTeamMembers(selectedSlot.availableMemberIds, db);
        assignedHostIds = collectiveHosts.map((member) => member.id);
        assignedHosts = collectiveHosts;
        assignedMemberId = assignedHostIds[0] ?? null;
      } else {
        // Fetch active assigned members ordered by last_booking_at ASC NULLS FIRST
        // (never booked = null = highest priority in round-robin)
        const { data: members } = await db
          .from("team_members")
          .select(
            "id, name, photo_url, google_access_token, google_refresh_token, google_token_expiry, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry, microsoft_calendar_ids, last_booking_at"
          )
          .in("id", assignedMemberIds)
          .eq("is_active", true)
          .order("last_booking_at", { ascending: true, nullsFirst: true });

        if (members && members.length > 0) {
          // Check free/busy in parallel to avoid N sequential Google round-trips.
          const freeResults = await Promise.all(
            members.map(async (member) => {
              try {
                return await isMemberCalendarFreeAtSlot(
                  member as MemberCalendarConnection,
                  date,
                  time,
                  durationMinutes
                );
              } catch {
                return false;
              }
            })
          );

          const selectedIndex = freeResults.findIndex(Boolean);
          if (selectedIndex >= 0) {
            const chosen = members[selectedIndex];
            assignedMemberId = chosen.id;
            assignedHostIds = [chosen.id];
            assignedHosts = [chosen];
          }
        }
      }
    }
    stageMs.round_robin = Date.now() - startedAt;

    // ── Insert the booking ───────────────────────────────────────────────────
    // The unique index (assigned_to, date, time) guards against race conditions.
    // If two concurrent requests pick the same member for the same slot,
    // the second insert fails with error code 23505 (unique_violation).
    // We fall back to host assignment in that edge case.
    const bookingPayloadBase = {
      date,
      time,
      event_slug: event_slug || null,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      notes: normalizedNotes,
      custom_answers: (custom_answers && typeof custom_answers === "object" && !Array.isArray(custom_answers)) ? custom_answers : null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_term: utm_term || null,
      utm_content: utm_content || null,
      gclid: gclid || null,
      li_fat_id: li_fat_id || null,
      fbclid: fbclid || null,
      ttclid: ttclid || null,
      msclkid: msclkid || null,
      assigned_to: assignedMemberId,
      assigned_host_ids: assignedHostIds,
      zoom_meeting_id: zoomMeetingId,
    };
    const bookingPayloadWithTelemetry = {
      ...bookingPayloadBase,
      source_ip: sourceIp,
      user_agent: userAgent,
    };

    let { data, error } = await db
      .from("bookings")
      .insert(bookingPayloadWithTelemetry)
      .select("id")
      .single();

    if (
      error &&
      (error.code === "42703" ||
        error.message.includes("source_ip") ||
        error.message.includes("user_agent"))
    ) {
      const retryWithoutTelemetry = await db
        .from("bookings")
        .insert(bookingPayloadBase)
        .select("id")
        .single();
      data = retryWithoutTelemetry.data;
      error = retryWithoutTelemetry.error;
    }

    // Race condition retry: another request just took this member+slot.
    // Fall back to no assignment (host handles it).
    if (error && error.code === "23505") {
      if (teamSchedulingMode === "collective") {
        return respond(
          { error: "That slot was just taken. Please choose another time." },
          409,
          { reason: "collective_slot_conflict" }
        );
      }
      console.warn("[bookings] unique_violation on assigned_to — falling back to host");
      const retry = await db
        .from("bookings")
        .insert({ ...bookingPayloadWithTelemetry, assigned_to: null, assigned_host_ids: [] })
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
      assignedMemberId = null;
      assignedHostIds = [];
      assignedHosts = null;

      if (
        error &&
        (error.code === "42703" ||
          error.message.includes("source_ip") ||
          error.message.includes("user_agent"))
      ) {
        const retryNoTelemetry = await db
          .from("bookings")
          .insert({ ...bookingPayloadBase, assigned_to: null, assigned_host_ids: [] })
          .select("id")
          .single();
        data = retryNoTelemetry.data;
        error = retryNoTelemetry.error;
      }
    }

    if (error) {
      console.error("[bookings] insert error:", error);
      return respond({ error: error.message }, 500, {
        reason: "booking_insert_failed",
        event_slug: event_slug || null,
      });
    }
    stageMs.booking_insert = Date.now() - startedAt;

    const bookingId = data!.id;
    const publicBaseUrl = resolvePublicBaseUrl({
      headers: request.headers,
      configuredBaseUrl: host?.booking_base_url ?? null,
    });
    const manageToken = createManageToken();
    let actionUrls: ReturnType<typeof buildBookingActionUrls> | null = buildBookingActionUrls(
      publicBaseUrl,
      manageToken.token
    );
    let manageUrl: string | null = actionUrls.manage;

    const { error: manageError } = await db
      .from("bookings")
      .update({
        manage_token_hash: manageToken.hash,
        manage_token_expires_at: manageToken.expiresAt,
      })
      .eq("id", bookingId);
    if (manageError) {
      if (
        manageError.code === "42703" ||
        manageError.message.includes("manage_token_hash") ||
        manageError.message.includes("manage_token_expires_at")
      ) {
        console.warn("[bookings] manage token columns missing; skipping manage link persistence");
        actionUrls = null;
        manageUrl = null;
      } else {
        console.warn("[bookings] failed to persist manage token:", manageError);
        actionUrls = null;
        manageUrl = null;
      }
    }
    stageMs.manage_link = Date.now() - startedAt;

    // ── Update last_booking_at for the assigned member ───────────────────────
    if (assignedHostIds.length > 0) {
      await db
        .from("team_members")
        .update({ last_booking_at: new Date().toISOString() })
        .in("id", assignedHostIds);
    }
    stageMs.member_update = Date.now() - startedAt;

    // ── Create Google Calendar event (non-fatal) ─────────────────────────────
    const calArgs = {
      date,
      time,
      name: normalizedName,
      email: normalizedEmail,
      durationMinutes,
      summary,
      description: appendBookingActionLinks(description, actionUrls),
      location,
    };
    let calendarEventId: string | null = null;
    const calendarEvents: Array<{ member_id: string; calendar_event_id: string }> = [];
    try {
      if (assignedHosts && assignedHosts.length > 0) {
        const eventResults = await Promise.allSettled(
          assignedHosts.map(async (member) => {
            const eventId = await createMemberCalendarEvent({
                ...calArgs,
              member: member as MemberCalendarConnection,
            });
            return eventId ? { member_id: member.id, calendar_event_id: eventId } : null;
          })
        );

        eventResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value) {
            calendarEvents.push(result.value);
          }
        });

        calendarEventId = calendarEvents[0]?.calendar_event_id ?? null;
      } else {
        calendarEventId = await createHostCalendarEvent(calArgs);
      }

      if (calendarEventId || calendarEvents.length > 0) {
        const { error: calendarIdUpdateError } = await db
          .from("bookings")
          .update({
            calendar_event_id: calendarEventId,
            calendar_events: calendarEvents,
          })
          .eq("id", bookingId);
        if (
          calendarIdUpdateError &&
          (calendarIdUpdateError.code === "42703" ||
            calendarIdUpdateError.message.includes("calendar_event_id"))
        ) {
          console.warn("[bookings] calendar_event_id column missing; skipping persistence");
        } else if (calendarIdUpdateError) {
          console.warn("[bookings] failed to persist calendar_event_id:", calendarIdUpdateError);
        }
      }
    } catch (calErr) {
      console.warn("[bookings] calendar event skipped (not connected?):", calErr);
    }
    stageMs.calendar_sync = Date.now() - startedAt;

    // ── Return assigned member info for the confirmation screen ──────────────
    const assignedHostsResponse = assignedHosts?.map((member) => ({
      id: member.id,
      name: member.name,
      photo_url: member.photo_url,
    })) ?? [];
    const assignedMember =
      assignedHostsResponse.length > 0
        ? {
            name: assignedHostsResponse[0].name,
            photo_url: assignedHostsResponse[0].photo_url,
          }
        : null;
    stageMs.assigned_member_lookup = Date.now() - startedAt;

    // ── Server-side booking webhooks (non-fatal) ────────────────────────────
    const envWebhook = process.env.CITACAL_BOOKING_WEBHOOK_URL?.trim();
    const envWebhookUrls = envWebhook
      ? envWebhook.split(",").map((u) => u.trim()).filter(Boolean)
      : [];
    const configuredWebhookUrls = Array.isArray(host?.webhook_urls)
      ? host.webhook_urls.filter((u): u is string => typeof u === "string")
      : [];
    const webhookUrls = [...new Set([...configuredWebhookUrls, ...envWebhookUrls])];

    if (webhookUrls.length > 0) {
      const payload = {
        event: "booking.confirmed" as const,
        occurred_at: new Date().toISOString(),
        booking: {
          id: bookingId,
          manage_url: manageUrl,
          reschedule_url: actionUrls?.reschedule ?? null,
          cancel_url: actionUrls?.cancel ?? null,
          event_slug: event_slug || null,
          date,
          time,
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          notes: normalizedNotes,
          status: "confirmed",
          assigned_to: assignedMemberId,
          assigned_host_ids: assignedHostIds,
          custom_answers: (custom_answers && typeof custom_answers === "object" && !Array.isArray(custom_answers))
            ? (custom_answers as Record<string, string | string[]>)
            : null,
        },
        assigned_member: assignedMember,
        assigned_hosts: assignedHostsResponse,
        utm: {
          source: utm_source || null,
          medium: utm_medium || null,
          campaign: utm_campaign || null,
          term: utm_term || null,
          content: utm_content || null,
        },
        click_ids: {
          gclid: gclid || null,
          fbclid: fbclid || null,
          li_fat_id: li_fat_id || null,
          ttclid: ttclid || null,
          msclkid: msclkid || null,
        },
      };

      try {
        await sendBookingConfirmedWebhooks({
          urls: webhookUrls,
          payload,
          secret: process.env.CITACAL_WEBHOOK_SECRET ?? null,
        });
      } catch (webhookErr) {
        console.warn("[bookings] webhook dispatch failed (non-fatal):", webhookErr);
      }
    }
    stageMs.webhooks = Date.now() - startedAt;

    // ── Google Sheets append (non-fatal) ────────────────────────────────────
    appendRow({
      id: bookingId,
      created_at: new Date().toISOString(),
      date: String(date),
      time: String(time),
      name: String(name),
      email: String(email),
      phone: typeof phone === "string" ? phone : null,
      notes: typeof notes === "string" ? notes : null,
      status: "confirmed",
      event_slug: event_slug ? String(event_slug) : null,
      assigned_to: assignedMemberId ?? null,
      utm_source: typeof utm_source === "string" ? utm_source : null,
      utm_medium: typeof utm_medium === "string" ? utm_medium : null,
      utm_campaign: typeof utm_campaign === "string" ? utm_campaign : null,
      utm_term: typeof utm_term === "string" ? utm_term : null,
      utm_content: typeof utm_content === "string" ? utm_content : null,
      gclid: typeof gclid === "string" ? gclid : null,
      fbclid: typeof fbclid === "string" ? fbclid : null,
      li_fat_id: typeof li_fat_id === "string" ? li_fat_id : null,
      ttclid: typeof ttclid === "string" ? ttclid : null,
      msclkid: typeof msclkid === "string" ? msclkid : null,
      zoom_meeting_id: zoomMeetingId,
      custom_answers: (custom_answers && typeof custom_answers === "object" && !Array.isArray(custom_answers))
        ? (custom_answers as Record<string, string | string[]>)
        : null,
    }); // intentionally not awaited — must never block booking response

    // ── Transactional emails (non-fatal) ─────────────────────────────────────
    // Fire-and-forget: email failures never block the booking confirmation.
    const emailParams = {
      toName: normalizedName,
      toEmail: normalizedEmail,
      date: String(date),
      time: String(time),
      durationMinutes,
      eventName,
      hostName,
      location: location || null,
      rescheduleUrl: actionUrls?.reschedule ?? null,
      cancelUrl: actionUrls?.cancel ?? null,
    };
    sendBookingConfirmationToAttendee(emailParams).catch((err) =>
      console.warn("[bookings] attendee confirmation email failed (non-fatal):", err)
    );
    if (hostEmail) {
      sendBookingNotificationToHost({
        toEmail: hostEmail,
        hostName,
        attendeeName: normalizedName,
        attendeeEmail: normalizedEmail,
        date: String(date),
        time: String(time),
        durationMinutes,
        eventName,
        location: location || null,
        manageUrl,
      }).catch((err) =>
        console.warn("[bookings] host notification email failed (non-fatal):", err)
      );
    }

    return respond(
      {
        id: bookingId,
        assigned_member: assignedMember,
        assigned_hosts: assignedHostsResponse,
        manage_url: manageUrl,
      },
      201,
      {
        event_slug: event_slug || null,
        assigned_member: Boolean(assignedMemberId),
        webhook_targets: webhookUrls.length,
        stages_ms: stageMs,
      }
    );
  } catch (err) {
    console.error("[bookings] unexpected error:", err);
    return respond({ error: "Internal server error" }, 500, { reason: "unexpected_error" });
  }
}

// ── GET /api/bookings ──────────────────────────────────────────────────────

export async function GET() {
  const startedAt = Date.now();
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  try {
    const db = createServerClient();

    const { data, error } = await db
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const durationMs = Date.now() - startedAt;
      console.info("[bookings] GET", { status: 500, duration_ms: durationMs });
      return NextResponse.json({ error: error.message }, {
        status: 500,
        headers: { "x-citacal-duration-ms": String(durationMs) },
      });
    }

    const durationMs = Date.now() - startedAt;
    console.info("[bookings] GET", {
      status: 200,
      duration_ms: durationMs,
      count: data?.length ?? 0,
    });
    return NextResponse.json({ bookings: data }, {
      headers: { "x-citacal-duration-ms": String(durationMs) },
    });
  } catch (err) {
    console.error("[bookings] GET error:", err);
    const durationMs = Date.now() - startedAt;
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
      headers: { "x-citacal-duration-ms": String(durationMs) },
    });
  }
}

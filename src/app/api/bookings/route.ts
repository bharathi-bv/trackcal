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
  createCalendarEvent,
  createCalendarEventForMember,
  isMemberFreeAtSlot,
} from "@/lib/google-calendar";
import { requireApiUser } from "@/lib/api-auth";

// ── POST /api/bookings ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      date,
      time,
      name,
      email,
      phone,
      notes,
      event_slug,
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
      return NextResponse.json(
        { error: "Missing required fields: date, time, name, email" },
        { status: 400 }
      );
    }

    const db = createServerClient();

    // ── Look up event type settings ──────────────────────────────────────────
    let durationMinutes = 30;
    let eventName = "Discovery Call";
    let titleTemplate: string | null = null;
    let eventDescription: string | null = null;
    let locationType: string | null = null;
    let locationValue: string | null = null;
    let assignedMemberIds: string[] = [];

    if (event_slug) {
      const { data: et } = await db
        .from("event_types")
        .select(
          "duration, name, title_template, description, location_type, location_value, assigned_member_ids"
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
      }
    }

    const { data: host } = await db
      .from("host_settings")
      .select("host_name")
      .limit(1)
      .maybeSingle();
    const hostName = host?.host_name?.trim() || "TrackCal Host";

    const summary = titleTemplate
      ? titleTemplate
          .replaceAll("{event_name}", eventName)
          .replaceAll("{invitee_name}", name)
          .replaceAll("{host_name}", hostName)
      : `${eventName} with ${name}`;

    const location =
      locationType === "custom" || locationType === "zoom" || locationType === "phone"
        ? locationValue || undefined
        : undefined;
    const description = [
      eventDescription,
      `Attendee: ${name} <${email}>`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    // ── Round-robin: pick the least-recently-booked free member ─────────────
    // If the event type has no assigned members, assignedMemberId stays null
    // and the booking falls back to the single-host calendar.
    let assignedMemberId: string | null = null;
    let assignedMemberTokens: {
      access_token: string | null;
      refresh_token: string;
      expiry: string | null;
      memberId: string;
    } | null = null;

    if (assignedMemberIds.length > 0) {
      // Fetch active assigned members ordered by last_booking_at ASC NULLS FIRST
      // (never booked = null = highest priority in round-robin)
      const { data: members } = await db
        .from("team_members")
        .select(
          "id, google_access_token, google_refresh_token, google_token_expiry, last_booking_at"
        )
        .in("id", assignedMemberIds)
        .eq("is_active", true)
        .order("last_booking_at", { ascending: true, nullsFirst: true });

      if (members && members.length > 0) {
        // Walk through members in round-robin order; pick first one who is free
        for (const member of members) {
          const free = await isMemberFreeAtSlot(member, date, time, durationMinutes);
          if (free) {
            assignedMemberId = member.id;
            assignedMemberTokens = member.google_refresh_token
              ? {
                  access_token: member.google_access_token,
                  refresh_token: member.google_refresh_token,
                  expiry: member.google_token_expiry,
                  memberId: member.id,
                }
              : null;
            break;
          }
        }
      }
    }

    // ── Insert the booking ───────────────────────────────────────────────────
    // The unique index (assigned_to, date, time) guards against race conditions.
    // If two concurrent requests pick the same member for the same slot,
    // the second insert fails with error code 23505 (unique_violation).
    // We fall back to host assignment in that edge case.
    const bookingPayload = {
      date,
      time,
      event_slug: event_slug || null,
      name,
      email,
      phone: phone || null,
      notes: notes || null,
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
    };

    let { data, error } = await db
      .from("bookings")
      .insert(bookingPayload)
      .select("id")
      .single();

    // Race condition retry: another request just took this member+slot.
    // Fall back to no assignment (host handles it).
    if (error && error.code === "23505") {
      console.warn("[bookings] unique_violation on assigned_to — falling back to host");
      const retry = await db
        .from("bookings")
        .insert({ ...bookingPayload, assigned_to: null })
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
      assignedMemberId = null;
      assignedMemberTokens = null;
    }

    if (error) {
      console.error("[bookings] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Update last_booking_at for the assigned member ───────────────────────
    if (assignedMemberId) {
      await db
        .from("team_members")
        .update({ last_booking_at: new Date().toISOString() })
        .eq("id", assignedMemberId);
    }

    // ── Create Google Calendar event (non-fatal) ─────────────────────────────
    const calArgs = { date, time, name, email, durationMinutes, summary, description, location };
    try {
      if (assignedMemberTokens) {
        await createCalendarEventForMember({ ...calArgs, memberTokens: assignedMemberTokens });
      } else {
        await createCalendarEvent(calArgs);
      }
    } catch (calErr) {
      console.warn("[bookings] calendar event skipped (not connected?):", calErr);
    }

    // ── Return assigned member info for the confirmation screen ──────────────
    let assignedMember: { name: string; photo_url: string | null } | null = null;
    if (assignedMemberId) {
      const { data: memberRow } = await db
        .from("team_members")
        .select("name, photo_url")
        .eq("id", assignedMemberId)
        .single();
      assignedMember = memberRow ?? null;
    }

    return NextResponse.json({ id: data!.id, assigned_member: assignedMember }, { status: 201 });
  } catch (err) {
    console.error("[bookings] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET /api/bookings ──────────────────────────────────────────────────────

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  try {
    const db = createServerClient();

    const { data, error } = await db
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookings: data });
  } catch (err) {
    console.error("[bookings] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

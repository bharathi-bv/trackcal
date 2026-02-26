/**
 * /api/bookings
 *
 * POST — Create a booking. Called from BookingWizard when user confirms.
 *        Receives booking details + all UTM/click-ID params, saves to Supabase.
 *
 * GET  — List all bookings. Will power the attribution dashboard (Phase 8).
 *
 * Uses the server client (service_role key) so it bypasses RLS.
 * Row Level Security will be enforced here once auth is added in Phase 6.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createCalendarEvent } from "@/lib/google-calendar";
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
      // UTM params
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      // Click IDs
      gclid,
      li_fat_id,
      fbclid,
      ttclid,
      msclkid,
    } = body;

    // Validate required fields
    if (!date || !time || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: date, time, name, email" },
        { status: 400 }
      );
    }

    const db = createServerClient();

    const { data, error } = await db
      .from("bookings")
      .insert({
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
      })
      .select("id")
      .single();

    if (error) {
      console.error("[bookings] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Look up event type settings so the calendar event reflects the event config
    let durationMinutes = 30;
    let eventName = "Discovery Call";
    let titleTemplate: string | null = null;
    let eventDescription: string | null = null;
    let locationType: string | null = null;
    let locationValue: string | null = null;
    if (event_slug) {
      const { data: et } = await db
        .from("event_types")
        .select("duration, name, title_template, description, location_type, location_value")
        .eq("slug", event_slug)
        .maybeSingle();
      if (et) {
        durationMinutes = et.duration;
        eventName = et.name ?? eventName;
        titleTemplate = et.title_template ?? null;
        eventDescription = et.description ?? null;
        locationType = et.location_type ?? null;
        locationValue = et.location_value ?? null;
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
    const description = [eventDescription, `Attendee: ${name} <${email}>`, notes ? `Notes: ${notes}` : null]
      .filter(Boolean)
      .join("\n\n");

    // Attempt to create a Google Calendar event and send invite to the booker.
    // We do this AFTER saving to Supabase so a calendar API failure never
    // prevents the booking from being recorded. Non-fatal.
    try {
      await createCalendarEvent({
        date,
        time,
        name,
        email,
        durationMinutes,
        summary,
        description,
        location,
      });
    } catch (calErr) {
      console.warn("[bookings] calendar event skipped (not connected?):", calErr);
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
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

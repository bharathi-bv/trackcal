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

    // Attempt to create a Google Calendar event and send invite to the booker.
    // We do this AFTER saving to Supabase so a calendar API failure never
    // prevents the booking from being recorded. Non-fatal.
    try {
      await createCalendarEvent({ date, time, name, email });
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

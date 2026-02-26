/**
 * GET /api/availability?date=YYYY-MM-DD[&event=slug]
 *
 * Returns available time slots for the given date.
 * If an event type slug is provided, uses that event type's settings
 * (duration, start/end hours, slot increment). Falls back to defaults.
 *
 * Response shapes:
 *   { slots: ["09:00 AM", "09:30 AM", ...] }   — calendar connected
 *   { slots: null, error: "..." }               — not connected / fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/google-calendar";
import { createServerClient } from "@/lib/supabase";

const DEFAULT_SETTINGS = {
  duration: 30,
  start_hour: 9,
  end_hour: 17,
  slot_increment: 30,
};

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const eventSlug = request.nextUrl.searchParams.get("event");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date param required in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  // Don't show slots for past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(date + "T00:00:00") < today) {
    return NextResponse.json({ slots: [] });
  }

  // Fetch event type settings if a slug was provided
  let settings = DEFAULT_SETTINGS;
  if (eventSlug) {
    const db = createServerClient();
    const { data: et } = await db
      .from("event_types")
      .select("duration, start_hour, end_hour, slot_increment")
      .eq("slug", eventSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (et) {
      settings = {
        duration: et.duration,
        start_hour: et.start_hour,
        end_hour: et.end_hour,
        slot_increment: et.slot_increment,
      };
    }
  }

  try {
    const slots = await getAvailableSlots(date, settings);
    return NextResponse.json({ slots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[availability] calendar not connected, returning null:", message);
    return NextResponse.json({ slots: null, error: message });
  }
}

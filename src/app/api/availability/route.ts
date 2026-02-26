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
import { normalizeWeeklyAvailability, type WeeklyAvailability } from "@/lib/event-type-config";

const DEFAULT_SETTINGS = {
  duration: 30,
  start_hour: 9,
  end_hour: 17,
  slot_increment: 30,
  min_notice_hours: 0,
  max_days_in_advance: 60,
  booking_window_type: "rolling" as "rolling" | "fixed",
  booking_window_start_date: null as string | null,
  booking_window_end_date: null as string | null,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  max_bookings_per_day: null as number | null,
  max_bookings_per_slot: null as number | null,
  blocked_dates: [] as string[],
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
      .select(
        "duration, start_hour, end_hour, slot_increment, min_notice_hours, max_days_in_advance, buffer_before_minutes, buffer_after_minutes, max_bookings_per_day, max_bookings_per_slot, weekly_availability, blocked_dates"
        + ", booking_window_type, booking_window_start_date, booking_window_end_date"
      )
      .eq("slug", eventSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (et) {
      // Use event's custom schedule if set; otherwise fall back to global host_settings schedule
      let weekly: WeeklyAvailability;
      if (et.weekly_availability) {
        weekly = normalizeWeeklyAvailability(et.weekly_availability);
      } else {
        const { data: hs } = await db
          .from("host_settings")
          .select("weekly_availability")
          .limit(1)
          .maybeSingle();
        weekly = normalizeWeeklyAvailability(hs?.weekly_availability ?? null);
      }
      const dayKey = String(new Date(date + "T00:00:00").getDay());
      const dayAvailability = weekly[dayKey];
      if (!dayAvailability?.enabled) {
        return NextResponse.json({ slots: [] });
      }

      const blockedDates = Array.isArray(et.blocked_dates)
        ? et.blocked_dates.filter((d: unknown): d is string => typeof d === "string")
        : [];
      if (blockedDates.includes(date)) {
        return NextResponse.json({ slots: [] });
      }

      settings = {
        duration: et.duration,
        start_hour: dayAvailability.start_hour ?? et.start_hour,
        end_hour: dayAvailability.end_hour ?? et.end_hour,
        slot_increment: et.slot_increment,
        min_notice_hours: et.min_notice_hours ?? 0,
        max_days_in_advance: et.max_days_in_advance ?? 60,
        booking_window_type: et.booking_window_type ?? "rolling",
        booking_window_start_date: et.booking_window_start_date ?? null,
        booking_window_end_date: et.booking_window_end_date ?? null,
        buffer_before_minutes: et.buffer_before_minutes ?? 0,
        buffer_after_minutes: et.buffer_after_minutes ?? 0,
        max_bookings_per_day: et.max_bookings_per_day ?? null,
        max_bookings_per_slot: et.max_bookings_per_slot ?? null,
        blocked_dates: blockedDates,
      };
    }
  }

  const requestedDate = new Date(date + "T00:00:00");
  if (settings.booking_window_type === "fixed") {
    if (!settings.booking_window_start_date || !settings.booking_window_end_date) {
      return NextResponse.json({ slots: [] });
    }
    if (
      date < settings.booking_window_start_date ||
      date > settings.booking_window_end_date
    ) {
      return NextResponse.json({ slots: [] });
    }
  } else {
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + settings.max_days_in_advance);
    if (requestedDate > maxDate) {
      return NextResponse.json({ slots: [] });
    }
  }

  // Enforce per-day cap before querying calendar
  if (eventSlug && settings.max_bookings_per_day) {
    const db = createServerClient();
    const { count } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("date", date)
      .eq("event_slug", eventSlug)
      .in("status", ["confirmed", "pending"]);
    if ((count ?? 0) >= settings.max_bookings_per_day) {
      return NextResponse.json({ slots: [] });
    }
  }

  try {
    const { slots, hostTimezone } = await getAvailableSlots(date, settings);
    // Enforce per-slot cap
    if (eventSlug && settings.max_bookings_per_slot && slots.length > 0) {
      const db = createServerClient();
      const { data: existing } = await db
        .from("bookings")
        .select("time")
        .eq("date", date)
        .eq("event_slug", eventSlug)
        .in("status", ["confirmed", "pending"]);

      const counts = new Map<string, number>();
      (existing ?? []).forEach((b) => counts.set(b.time, (counts.get(b.time) ?? 0) + 1));
      const filtered = slots.filter((slot) => (counts.get(slot) ?? 0) < settings.max_bookings_per_slot!);
      return NextResponse.json({ slots: filtered, hostTimezone });
    }

    return NextResponse.json({ slots, hostTimezone });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[availability] calendar not connected, returning null:", message);
    return NextResponse.json({ slots: null, error: message });
  }
}

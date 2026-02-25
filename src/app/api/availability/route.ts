/**
 * GET /api/availability?date=YYYY-MM-DD
 *
 * Returns the list of available 30-min time slots for the given date,
 * based on the host's real Google Calendar (minus any existing events).
 *
 * If Google Calendar isn't connected yet, returns slots: null so the
 * frontend can fall back to showing hardcoded default slots — useful
 * during development before OAuth is set up.
 *
 * Response shapes:
 *   { slots: ["09:00 AM", "09:30 AM", ...] }   — calendar connected
 *   { slots: null, error: "..." }               — not connected / fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

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

  try {
    const slots = await getAvailableSlots(date);
    return NextResponse.json({ slots });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("[availability] calendar not connected, returning null:", message);
    // Return null slots — TimeSlotSelector will fall back to hardcoded defaults
    return NextResponse.json({ slots: null, error: message });
  }
}

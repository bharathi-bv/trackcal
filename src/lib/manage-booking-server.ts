import "server-only";

import { createServerClient } from "@/lib/supabase";
import { hashManageToken } from "@/lib/booking-manage";

const DEFAULT_DURATION = 30;
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;
const DEFAULT_SLOT_INCREMENT = 30;

type BookingRow = {
  id: string;
  status: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  event_slug: string | null;
  manage_token_expires_at: string | null;
};

type EventTypeRow = {
  name: string | null;
  description: string | null;
  duration: number | null;
  start_hour: number | null;
  end_hour: number | null;
  slot_increment: number | null;
};

export type ManageBookingView = {
  id: string;
  status: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  event_slug: string | null;
  event_name: string;
  event_description: string | null;
  duration: number;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
  host_name: string | null;
  host_profile_photo_url: string | null;
  can_reschedule: boolean;
  expires_at: string;
};

export async function loadManageBookingView(token: string): Promise<ManageBookingView | null> {
  const db = createServerClient();
  const hash = hashManageToken(token);

  const { data: bookingRaw } = await db
    .from("bookings")
    .select(
      "id, status, date, time, name, email, phone, notes, event_slug, manage_token_expires_at"
    )
    .eq("manage_token_hash", hash)
    .maybeSingle();

  if (!bookingRaw) return null;

  const booking = bookingRaw as BookingRow;
  if (!booking.manage_token_expires_at) return null;
  if (new Date(booking.manage_token_expires_at).getTime() <= Date.now()) return null;

  let eventName = booking.event_slug || "Discovery Call";
  let duration = DEFAULT_DURATION;
  let eventDescription: string | null = null;
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  let slotIncrement = DEFAULT_SLOT_INCREMENT;

  if (booking.event_slug) {
    const { data: eventTypeRaw } = await db
      .from("event_types")
      .select("name, description, duration, start_hour, end_hour, slot_increment")
      .eq("slug", booking.event_slug)
      .eq("is_active", true)
      .maybeSingle();

    if (eventTypeRaw) {
      const eventType = eventTypeRaw as EventTypeRow;
      if (eventType.name) eventName = eventType.name;
      if (typeof eventType.description === "string") eventDescription = eventType.description;
      if (typeof eventType.duration === "number") duration = eventType.duration;
      if (typeof eventType.start_hour === "number") startHour = eventType.start_hour;
      if (typeof eventType.end_hour === "number") endHour = eventType.end_hour;
      if (typeof eventType.slot_increment === "number") slotIncrement = eventType.slot_increment;
    }
  }

  const { data: hostSettings } = await db
    .from("host_settings")
    .select("host_name, profile_photo_url")
    .limit(1)
    .maybeSingle();

  return {
    id: booking.id,
    status: booking.status,
    date: booking.date,
    time: booking.time,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    notes: booking.notes,
    event_slug: booking.event_slug,
    event_name: eventName,
    event_description: eventDescription,
    duration,
    start_hour: startHour,
    end_hour: endHour,
    slot_increment: slotIncrement,
    host_name: hostSettings?.host_name ?? null,
    host_profile_photo_url: hostSettings?.profile_photo_url ?? null,
    can_reschedule: booking.status !== "cancelled",
    expires_at: booking.manage_token_expires_at,
  };
}

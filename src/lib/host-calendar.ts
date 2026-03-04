import {
  createCalendarEvent,
  deleteCalendarEvent,
  getAvailableSlots,
  updateCalendarEvent,
} from "./google-calendar";
import {
  createOutlookCalendarEvent,
  deleteOutlookCalendarEvent,
  getAvailableSlotsOutlook,
  updateOutlookCalendarEvent,
} from "./outlook-calendar";
import { createServerClient } from "./supabase";

type HostCalendarProvider = "google" | "microsoft";

async function getHostCalendarProvider(): Promise<HostCalendarProvider> {
  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select(
      "calendar_provider, google_refresh_token, microsoft_refresh_token"
    )
    .limit(1)
    .maybeSingle();

  if (data?.calendar_provider === "microsoft" && data.microsoft_refresh_token) {
    return "microsoft";
  }
  if (data?.calendar_provider === "google" && data.google_refresh_token) {
    return "google";
  }
  if (data?.microsoft_refresh_token) return "microsoft";
  if (data?.google_refresh_token) return "google";
  throw new Error("No host calendar connected.");
}

export async function getHostAvailableSlots(
  date: string,
  settings: Parameters<typeof getAvailableSlots>[1]
) {
  const provider = await getHostCalendarProvider();
  if (provider === "microsoft") {
    return getAvailableSlotsOutlook(date, settings);
  }
  return getAvailableSlots(date, settings);
}

export async function createHostCalendarEvent(
  args: Parameters<typeof createCalendarEvent>[0]
) {
  const provider = await getHostCalendarProvider();
  if (provider === "microsoft") {
    return createOutlookCalendarEvent(args);
  }
  return createCalendarEvent(args);
}

export async function updateHostCalendarEvent(
  args: Parameters<typeof updateCalendarEvent>[0]
) {
  const provider = await getHostCalendarProvider();
  if (provider === "microsoft") {
    return updateOutlookCalendarEvent(args);
  }
  return updateCalendarEvent(args);
}

export async function deleteHostCalendarEvent(eventId: string) {
  const provider = await getHostCalendarProvider();
  if (provider === "microsoft") {
    return deleteOutlookCalendarEvent(eventId);
  }
  return deleteCalendarEvent(eventId);
}

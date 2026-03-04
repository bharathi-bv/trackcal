import { listHostGoogleCalendars, type ConnectedCalendar } from "@/lib/google-calendar";
import { listHostOutlookCalendars, type ConnectedOutlookCalendar } from "@/lib/outlook-calendar";
import {
  listMemberConnectedCalendars,
  type MemberCalendarConnection,
  type MemberConnectedCalendar,
} from "@/lib/member-calendar";
import { createServerClient } from "@/lib/supabase";

export type HostCalendarConnectionState = {
  provider: "google" | "microsoft" | null;
  connected: boolean;
  selectedCalendarIds: string[];
  calendars: Array<(ConnectedCalendar | ConnectedOutlookCalendar) & { provider: "google" | "microsoft" }>;
};

export type MemberCalendarConnectionState = {
  provider: "google" | "microsoft" | null;
  connected: boolean;
  selectedCalendarIds: string[];
  calendars: MemberConnectedCalendar[];
};

export async function getHostCalendarConnectionState(): Promise<HostCalendarConnectionState> {
  const db = createServerClient();
  const { data: host } = await db
    .from("host_settings")
    .select(
      "calendar_provider, google_refresh_token, microsoft_refresh_token, google_calendar_ids, microsoft_calendar_ids"
    )
    .limit(1)
    .maybeSingle();

  const provider =
    host?.microsoft_refresh_token && host?.calendar_provider === "microsoft"
      ? "microsoft"
      : host?.google_refresh_token && host?.calendar_provider === "google"
        ? "google"
        : host?.microsoft_refresh_token
          ? "microsoft"
          : host?.google_refresh_token
            ? "google"
            : null;

  if (!provider) {
    return {
      provider: null,
      connected: false,
      selectedCalendarIds: [],
      calendars: [],
    };
  }

  try {
    const calendars =
      provider === "microsoft"
        ? (await listHostOutlookCalendars()).map((calendar) => ({
            ...calendar,
            provider: "microsoft" as const,
          }))
        : (await listHostGoogleCalendars()).map((calendar) => ({
            ...calendar,
            provider: "google" as const,
          }));
    return {
      provider,
      connected: true,
      selectedCalendarIds:
        provider === "microsoft"
          ? host?.microsoft_calendar_ids ?? []
          : host?.google_calendar_ids ?? [],
      calendars,
    };
  } catch {
    return {
      provider,
      connected: true,
      selectedCalendarIds:
        provider === "microsoft"
          ? host?.microsoft_calendar_ids ?? []
          : host?.google_calendar_ids ?? [],
      calendars: [],
    };
  }
}

export async function getMemberCalendarConnectionState(
  member: MemberCalendarConnection
): Promise<MemberCalendarConnectionState> {
  const provider = member.microsoft_refresh_token
    ? "microsoft"
    : member.google_refresh_token
      ? "google"
      : null;

  if (!provider) {
    return {
      provider: null,
      connected: false,
      selectedCalendarIds: [],
      calendars: [],
    };
  }

  try {
    return {
      provider,
      connected: true,
      selectedCalendarIds:
        provider === "microsoft"
          ? member.microsoft_calendar_ids ?? []
          : member.google_calendar_ids ?? [],
      calendars: await listMemberConnectedCalendars(member),
    };
  } catch {
    return {
      provider,
      connected: true,
      selectedCalendarIds:
        provider === "microsoft"
          ? member.microsoft_calendar_ids ?? []
          : member.google_calendar_ids ?? [],
      calendars: [],
    };
  }
}

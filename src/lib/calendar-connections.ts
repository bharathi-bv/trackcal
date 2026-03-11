import { listHostGoogleCalendars, listGoogleCalendarsWithAccessToken, type ConnectedCalendar } from "@/lib/google-calendar";
import { listHostOutlookCalendars, listOutlookCalendarsWithAccessToken, type ConnectedOutlookCalendar } from "@/lib/outlook-calendar";
import {
  listMemberConnectedCalendars,
  type MemberCalendarConnection,
  type MemberConnectedCalendar,
} from "@/lib/member-calendar";
import { createServerClient } from "@/lib/supabase";
import {
  getCalendarAccounts,
  type CalendarAccountState,
} from "@/lib/calendar-accounts";

export type HostCalendarConnectionState = {
  provider: "google" | "microsoft" | null;
  connected: boolean;
  selectedCalendarIds: string[];
  calendars: Array<(ConnectedCalendar | ConnectedOutlookCalendar) & { provider: "google" | "microsoft" }>;
};

export type MultiCalendarState = {
  accounts: CalendarAccountState[];
};

export async function getMultiCalendarState(): Promise<MultiCalendarState> {
  const db = createServerClient();

  let rawAccounts: Awaited<ReturnType<typeof getCalendarAccounts>> = [];
  try {
    rawAccounts = await getCalendarAccounts(db);
  } catch {
    rawAccounts = [];
  }

  // Fallback: if no calendar_accounts rows yet, read from host_settings (legacy)
  if (rawAccounts.length === 0) {
    const { data: host } = await db
      .from("host_settings")
      .select("calendar_provider, google_refresh_token, microsoft_refresh_token, google_calendar_ids, microsoft_calendar_ids")
      .limit(1)
      .maybeSingle();

    const accounts: CalendarAccountState[] = [];

    if (host?.google_refresh_token) {
      const cals = await listHostGoogleCalendars().catch(() => []);
      accounts.push({
        id: "legacy-google",
        provider: "google",
        email: cals.find((c) => c.isPrimary)?.id ?? null,
        calendars: cals,
        selectedCalendarIds: (host.google_calendar_ids as string[]) ?? [],
        isWrite: host.calendar_provider === "google" || !host.microsoft_refresh_token,
      });
    }

    if (host?.microsoft_refresh_token) {
      const cals = await listHostOutlookCalendars().catch(() => []);
      accounts.push({
        id: "legacy-microsoft",
        provider: "microsoft",
        email: null, // legacy — email not stored
        calendars: cals,
        selectedCalendarIds: (host.microsoft_calendar_ids as string[]) ?? [],
        isWrite: host.calendar_provider === "microsoft",
      });
    }

    return { accounts };
  }

  // List calendars for each account in parallel (best-effort)
  const accountStates = await Promise.all(
    rawAccounts.map(async (account): Promise<CalendarAccountState> => {
      try {
        const calendars =
          account.provider === "google"
            ? await listGoogleCalendarsWithAccessToken(account.access_token ?? "")
            : await listOutlookCalendarsWithAccessToken(account.access_token ?? "");
        return {
          id: account.id,
          provider: account.provider,
          email: account.email,
          calendars,
          selectedCalendarIds: account.calendar_ids,
          isWrite: account.is_write_calendar,
        };
      } catch {
        return {
          id: account.id,
          provider: account.provider,
          email: account.email,
          calendars: [],
          selectedCalendarIds: account.calendar_ids,
          isWrite: account.is_write_calendar,
        };
      }
    })
  );

  return { accounts: accountStates };
}

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

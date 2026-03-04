/**
 * google-calendar.ts
 *
 * All Google Calendar logic lives here.
 *
 * Responsibilities:
 * 1. OAuth — consent URL + token exchange for both the host and team members
 * 2. Availability — query freebusy API, return open slots
 *    - Single host:  getAvailableSlots()
 *    - Team (union): getTeamAvailableSlots()
 * 3. Events — create a calendar event on the host's or a team member's calendar
 * 4. Round-robin helper — isMemberFreeAtSlot() for booking assignment
 *
 * Token storage:
 *   Host tokens   → host_settings table (single row)
 *   Member tokens → team_members table (one row per member)
 */

import { google } from "googleapis";
import type { AvailabilityRange } from "./event-type-config";
import { createServerClient } from "./supabase";
import { isMemberAvailableOutlook } from "./outlook-calendar";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;
const DEFAULT_SLOT_MINUTES = 30;

export type SlotSettings = {
  duration: number;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
  availability_ranges?: AvailabilityRange[];
  min_notice_hours?: number;
  max_days_in_advance?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
};

export type MemberCalendarTokens = {
  access_token: string | null;
  refresh_token: string;
  expiry: string | null;
  memberId: string;
  calendar_ids?: string[] | null;
};

export type ConnectedCalendar = {
  id: string;
  name: string;
  isPrimary: boolean;
};

type CalendarEventInput = {
  date: string;
  time: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
};

// ── OAuth client factories ───────────────────────────────────────────────────

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getMemberOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_MEMBER_REDIRECT_URI
  );
}

// ── Host OAuth ───────────────────────────────────────────────────────────────

export function getAuthUrl(): string {
  const auth = getOAuth2Client();
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCodeAndSave(code: string): Promise<void> {
  const auth = getOAuth2Client();
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  const calendars = await listGoogleCalendarsForAuth(auth);
  const defaultCalendarId = calendars.find((calendar) => calendar.isPrimary)?.id ?? "primary";

  const db = createServerClient();
  const { data: existing } = await db
    .from("host_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  const tokenData = {
    google_access_token: tokens.access_token ?? null,
    ...(tokens.refresh_token ? { google_refresh_token: tokens.refresh_token } : {}),
    google_token_expiry: tokens.expiry_date?.toString() ?? null,
    google_calendar_ids: [defaultCalendarId],
    calendar_provider: "google",
    microsoft_access_token: null,
    microsoft_refresh_token: null,
    microsoft_token_expiry: null,
    microsoft_calendar_ids: [],
  };

  const legacyTokenData = {
    google_access_token: tokens.access_token ?? null,
    ...(tokens.refresh_token ? { google_refresh_token: tokens.refresh_token } : {}),
    google_token_expiry: tokens.expiry_date?.toString() ?? null,
    google_calendar_ids: [defaultCalendarId],
  };

  if (existing) {
    let result = await db.from("host_settings").update(tokenData).eq("id", existing.id);
    if (
      result.error &&
      (result.error.code === "42703" ||
        result.error.message.includes("calendar_provider") ||
        result.error.message.includes("microsoft_"))
    ) {
      result = await db.from("host_settings").update(legacyTokenData).eq("id", existing.id);
    }
    if (result.error) throw new Error(`Failed to update host_settings: ${result.error.message}`);
  } else {
    let result = await db.from("host_settings").insert(tokenData);
    if (
      result.error &&
      (result.error.code === "42703" ||
        result.error.message.includes("calendar_provider") ||
        result.error.message.includes("microsoft_"))
    ) {
      result = await db.from("host_settings").insert(legacyTokenData);
    }
    if (result.error) throw new Error(`Failed to insert host_settings: ${result.error.message}`);
  }
}

// ── Team member OAuth ────────────────────────────────────────────────────────

/**
 * Builds the Google consent URL for a team member.
 * The memberId is passed through as the OAuth `state` param so the
 * callback knows which team_members row to update.
 */
export function getAuthUrlForMember(memberId: string): string {
  const auth = getMemberOAuth2Client();
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: memberId,
  });
}

/**
 * Exchanges the OAuth code for tokens and saves them to the team_members row.
 * Called from /api/auth/google/member/callback.
 */
export async function exchangeCodeAndSaveForMember(
  code: string,
  memberId: string
): Promise<void> {
  const auth = getMemberOAuth2Client();
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  const calendars = await listGoogleCalendarsForAuth(auth);
  const defaultCalendarId = calendars.find((calendar) => calendar.isPrimary)?.id ?? "primary";

  const tokenData: Record<string, string | null> = {
    google_access_token: tokens.access_token ?? null,
    google_token_expiry: tokens.expiry_date?.toString() ?? null,
  };
  if (tokens.refresh_token) {
    tokenData.google_refresh_token = tokens.refresh_token;
  }

  const db = createServerClient();
  const { error } = await db
    .from("team_members")
    .update({
      ...tokenData,
      google_calendar_ids: [defaultCalendarId],
      microsoft_calendar_ids: [],
      microsoft_access_token: null,
      microsoft_refresh_token: null,
      microsoft_token_expiry: null,
    })
    .eq("id", memberId);
  if (error) throw new Error(`Failed to save member tokens: ${error.message}`);
}

// ── Authenticated clients ─────────────────────────────────────────────────────

/** Reads host tokens from host_settings and builds an OAuth2 client. */
async function getAuthedClient() {
  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .limit(1)
    .maybeSingle();

  if (!data?.google_refresh_token) {
    throw new Error(
      "Google Calendar not connected. Visit /api/auth/google to connect."
    );
  }

  const auth = getOAuth2Client();
  auth.setCredentials({
    access_token: data.google_access_token,
    refresh_token: data.google_refresh_token,
    expiry_date: data.google_token_expiry ? Number(data.google_token_expiry) : undefined,
  });

  auth.on("tokens", async (newTokens) => {
    const update: Record<string, string | null> = {
      google_access_token: newTokens.access_token ?? null,
      google_token_expiry: newTokens.expiry_date?.toString() ?? null,
    };
    if (newTokens.refresh_token) update.google_refresh_token = newTokens.refresh_token;
    const { data: row } = await createServerClient()
      .from("host_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (row) {
      await createServerClient().from("host_settings").update(update).eq("id", row.id);
    }
  });

  return auth;
}

/**
 * Builds an OAuth2 client from explicit tokens (for team members).
 * Wires token refresh persistence back to the team_members row.
 */
export function buildAuthedClientFromTokens(tokens: {
  access_token: string | null;
  refresh_token: string;
  expiry: string | null;
  memberId: string;
}) {
  const auth = getOAuth2Client();
  auth.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry ? Number(tokens.expiry) : undefined,
  });

  auth.on("tokens", async (newTokens) => {
    const update: Record<string, string | null> = {
      google_access_token: newTokens.access_token ?? null,
      google_token_expiry: newTokens.expiry_date?.toString() ?? null,
    };
    if (newTokens.refresh_token) update.google_refresh_token = newTokens.refresh_token;
    await createServerClient()
      .from("team_members")
      .update(update)
      .eq("id", tokens.memberId);
  });

  return auth;
}

// ── Timezone helpers ─────────────────────────────────────────────────────────

/**
 * Returns the UTC offset string (e.g. "+05:30") for a given IANA timezone
 * on a specific reference date. Using a reference date handles DST correctly.
 */
function getOffsetString(timeZone: string, ref: Date): string {
  const utc = new Date(ref.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(ref.toLocaleString("en-US", { timeZone }));
  const mins = (local.getTime() - utc.getTime()) / 60000;
  const abs = Math.abs(mins);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${mins >= 0 ? "+" : "-"}${h}:${m}`;
}

function minutesToLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/** Parse "02:00 PM" → total minutes from midnight. */
export function timeLabelToMinutes(label: string): number {
  const [timePart, period] = label.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// ── Internal: compute free slots for any auth client ─────────────────────────

async function getAvailableSlotsForAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any,
  date: string,
  settings: SlotSettings,
  calendarIds: string[] = ["primary"]
): Promise<{ slots: string[]; hostTimezone: string }> {
  const calendar = google.calendar({ version: "v3", auth });
  const effectiveCalendarIds = calendarIds.length > 0 ? calendarIds : ["primary"];
  const timezoneCalendarId = effectiveCalendarIds[0] ?? "primary";

  const { data: calData } = await calendar.calendars.get({ calendarId: timezoneCalendarId });
  const tz = calData.timeZone ?? "UTC";

  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));
  const dayStart = `${date}T${String(settings.start_hour).padStart(2, "0")}:00:00${offsetStr}`;
  const dayEnd = `${date}T${String(settings.end_hour).padStart(2, "0")}:00:00${offsetStr}`;

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart,
      timeMax: dayEnd,
      items: effectiveCalendarIds.map((id) => ({ id })),
    },
  });

  const busy = Object.values(data.calendars ?? {}).flatMap((calendarRow) => calendarRow?.busy ?? []);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const available: string[] = [];
  const ranges =
    settings.availability_ranges && settings.availability_ranges.length > 0
      ? settings.availability_ranges
      : [{ start_hour: settings.start_hour, end_hour: settings.end_hour }];

  for (const range of ranges) {
    for (
      let t = range.start_hour * 60;
      t + settings.duration <= range.end_hour * 60;
      t += settings.slot_increment
    ) {
      const slotStart = new Date(localMidnight.getTime() + t * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + settings.duration * 60 * 1000);
      const minNoticeMs = (settings.min_notice_hours ?? 0) * 60 * 60 * 1000;
      const earliestAllowed = new Date(Date.now() + minNoticeMs);

      const isBusy = busy.some((b) => {
        const busyStart = new Date(b.start!);
        const busyEnd = new Date(b.end!);
        const slotStartWithBuffer = new Date(
          slotStart.getTime() - (settings.buffer_before_minutes ?? 0) * 60 * 1000
        );
        const slotEndWithBuffer = new Date(
          slotEnd.getTime() + (settings.buffer_after_minutes ?? 0) * 60 * 1000
        );
        return slotStartWithBuffer < busyEnd && slotEndWithBuffer > busyStart;
      });

      const isInPast = slotStart <= earliestAllowed;

      if (!isBusy && !isInPast) {
        available.push(minutesToLabel(t));
      }
    }
  }

  return { slots: [...new Set(available)], hostTimezone: tz };
}

export async function getAvailableSlotsForMemberTokens(
  date: string,
  settings: SlotSettings,
  memberTokens: MemberCalendarTokens
): Promise<{ slots: string[]; hostTimezone: string }> {
  const auth = buildAuthedClientFromTokens(memberTokens);
  return getAvailableSlotsForAuth(auth, date, settings, memberTokens.calendar_ids ?? ["primary"]);
}

// ── Availability: single host ────────────────────────────────────────────────

export async function getAvailableSlots(
  date: string,
  settings: SlotSettings = {
    duration: DEFAULT_SLOT_MINUTES,
    start_hour: DEFAULT_START_HOUR,
    end_hour: DEFAULT_END_HOUR,
    slot_increment: DEFAULT_SLOT_MINUTES,
  }
): Promise<{ slots: string[]; hostTimezone: string }> {
  const db = createServerClient();
  const { data: host } = await db
    .from("host_settings")
    .select("google_calendar_ids")
    .limit(1)
    .maybeSingle();
  const auth = await getAuthedClient();
  return getAvailableSlotsForAuth(auth, date, settings, host?.google_calendar_ids ?? ["primary"]);
}

// ── Availability: union across team members ───────────────────────────────────

/**
 * Queries freebusy for each assigned team member in parallel.
 * Returns the UNION of available slots — a slot appears if ≥1 member is free.
 * Members without a connected calendar are silently skipped.
 */
export async function getTeamAvailableSlots(
  date: string,
  settings: SlotSettings,
  memberIds: string[]
): Promise<{ slots: string[]; hostTimezone: string }> {
  const db = createServerClient();
  const { data: members } = await db
    .from("team_members")
    .select("id, google_access_token, google_refresh_token, google_token_expiry, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry")
    .in("id", memberIds)
    .eq("is_active", true);

  const connected = (members ?? []).filter((m) => m.google_refresh_token || m.microsoft_refresh_token);
  if (connected.length === 0) {
    return { slots: [], hostTimezone: "UTC" };
  }

  const results = await Promise.allSettled(
    connected.map((member) => {
      if (member.microsoft_refresh_token) {
        // Outlook member — use Outlook availability (not yet implemented as slot list, fall through to Google path)
        // For now, fall back to Google if both tokens exist, otherwise skip
        if (!member.google_refresh_token) {
          return Promise.resolve({ slots: [] as string[], hostTimezone: "UTC" });
        }
      }
      const auth = buildAuthedClientFromTokens({
        access_token: member.google_access_token,
        refresh_token: member.google_refresh_token!,
        expiry: member.google_token_expiry,
        memberId: member.id,
      });
      return getAvailableSlotsForAuth(auth, date, settings);
    })
  );

  const unionSlots = new Set<string>();
  let hostTimezone = "UTC";

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      result.value.slots.forEach((s) => unionSlots.add(s));
      if (result.value.hostTimezone !== "UTC") {
        hostTimezone = result.value.hostTimezone;
      }
    }
  });

  const sorted = [...unionSlots].sort(
    (a, b) => timeLabelToMinutes(a) - timeLabelToMinutes(b)
  );

  return { slots: sorted, hostTimezone };
}

// ── Round-robin: check a member's calendar for a specific slot ────────────────

/**
 * Returns true if the team member's Google Calendar is free during the
 * requested slot. Used in the booking POST to pick the right member.
 * Returns false if the member hasn't connected their calendar.
 */
export async function isMemberFreeAtSlot(
  member: {
    id: string;
    google_access_token: string | null;
    google_refresh_token: string | null;
    google_token_expiry: string | null;
    google_calendar_ids?: string[] | null;
    microsoft_access_token?: string | null;
    microsoft_refresh_token?: string | null;
    microsoft_token_expiry?: string | null;
    microsoft_calendar_ids?: string[] | null;
  },
  date: string,
  time: string,
  durationMinutes: number
): Promise<boolean> {
  // If member has Microsoft tokens, use Outlook availability check
  if (member.microsoft_refresh_token) {
    const totalMins = timeLabelToMinutes(time);
    const localMidnight = new Date(`${date}T00:00:00Z`);
    const slotStart = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    return isMemberAvailableOutlook(
      {
        id: member.id,
        microsoft_access_token: member.microsoft_access_token,
        microsoft_refresh_token: member.microsoft_refresh_token,
        microsoft_token_expiry: member.microsoft_token_expiry,
        microsoft_calendar_ids: member.microsoft_calendar_ids,
      },
      slotStart,
      slotEnd
    );
  }

  if (!member.google_refresh_token) return false;

  const auth = buildAuthedClientFromTokens({
    access_token: member.google_access_token,
    refresh_token: member.google_refresh_token,
    expiry: member.google_token_expiry,
    memberId: member.id,
  });

  const calendar = google.calendar({ version: "v3", auth });
  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";
  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));

  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const slotStart = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: slotStart.toISOString(),
      timeMax: slotEnd.toISOString(),
      items: (member.google_calendar_ids && member.google_calendar_ids.length > 0
        ? member.google_calendar_ids
        : ["primary"]).map((id) => ({ id })),
    },
  });

  const busy = Object.values(data.calendars ?? {}).flatMap((calendarRow) => calendarRow?.busy ?? []);
  return busy.length === 0;
}

async function listGoogleCalendarsForAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any
): Promise<ConnectedCalendar[]> {
  const calendar = google.calendar({ version: "v3", auth });
  const calendars: ConnectedCalendar[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await calendar.calendarList.list({ maxResults: 250, pageToken });
    (data.items ?? []).forEach((item) => {
      if (!item.id) return;
      calendars.push({
        id: item.id,
        name: item.summary || item.id,
        isPrimary: Boolean(item.primary),
      });
    });
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return calendars;
}

export async function listHostGoogleCalendars(): Promise<ConnectedCalendar[]> {
  const auth = await getAuthedClient();
  return listGoogleCalendarsForAuth(auth);
}

export async function listMemberGoogleCalendars(memberTokens: MemberCalendarTokens): Promise<ConnectedCalendar[]> {
  const auth = buildAuthedClientFromTokens(memberTokens);
  return listGoogleCalendarsForAuth(auth);
}

// ── Internal: insert a calendar event using any auth client ──────────────────

async function _insertCalendarEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any,
  {
    date,
    time,
    name,
    email,
    durationMinutes = DEFAULT_SLOT_MINUTES,
    summary,
    description,
    location,
  }: {
    date: string;
    time: string;
    name: string;
    email: string;
    durationMinutes?: number;
    summary?: string;
    description?: string;
    location?: string;
  }
): Promise<string | null> {
  const calendar = google.calendar({ version: "v3", auth });
  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";
  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));

  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  const result = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary: summary || `${durationMinutes}-Minute Discovery Call with ${name}`,
      start: { dateTime: startDt.toISOString(), timeZone: tz },
      end: { dateTime: endDt.toISOString(), timeZone: tz },
      attendees: [{ email, displayName: name }],
      description: description || `Booked via CitaCal.\n\nAttendee: ${name} <${email}>`,
      ...(location ? { location } : {}),
      conferenceData: {
        createRequest: {
          requestId: `citacal-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return result.data.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _updateCalendarEvent(auth: any, eventId: string, args: CalendarEventInput): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth });
  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";
  const offsetStr = getOffsetString(tz, new Date(`${args.date}T12:00:00Z`));
  const totalMins = timeLabelToMinutes(args.time);
  const localMidnight = new Date(`${args.date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(
    startDt.getTime() + (args.durationMinutes ?? DEFAULT_SLOT_MINUTES) * 60 * 1000
  );

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
    requestBody: {
      start: { dateTime: startDt.toISOString(), timeZone: tz },
      end: { dateTime: endDt.toISOString(), timeZone: tz },
      ...(args.summary ? { summary: args.summary } : {}),
      ...(args.description ? { description: args.description } : {}),
      ...(args.location ? { location: args.location } : {}),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _deleteCalendarEvent(auth: any, eventId: string): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
  });
}

// ── Create a Google Calendar event on the host's calendar ────────────────────

export async function createCalendarEvent({
  date,
  time,
  name,
  email,
  durationMinutes = DEFAULT_SLOT_MINUTES,
  summary,
  description,
  location,
}: {
  date: string;
  time: string;
  name: string;
  email: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
}): Promise<string | null> {
  const auth = await getAuthedClient();
  return _insertCalendarEvent(auth, {
    date, time, name, email, durationMinutes, summary, description, location,
  });
}

// ── Create a Google Calendar event on a team member's calendar ───────────────

export async function createCalendarEventForMember({
  date,
  time,
  name,
  email,
  durationMinutes = DEFAULT_SLOT_MINUTES,
  summary,
  description,
  location,
  memberTokens,
}: {
  date: string;
  time: string;
  name: string;
  email: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
  memberTokens: MemberCalendarTokens;
}): Promise<string | null> {
  const auth = buildAuthedClientFromTokens(memberTokens);
  return _insertCalendarEvent(auth, {
    date, time, name, email, durationMinutes, summary, description, location,
  });
}

export async function updateCalendarEvent({
  eventId,
  date,
  time,
  durationMinutes = DEFAULT_SLOT_MINUTES,
  summary,
  description,
  location,
}: {
  eventId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
}): Promise<void> {
  const auth = await getAuthedClient();
  await _updateCalendarEvent(auth, eventId, {
    date,
    time,
    durationMinutes,
    summary,
    description,
    location,
  });
}

export async function updateCalendarEventForMember({
  eventId,
  date,
  time,
  durationMinutes = DEFAULT_SLOT_MINUTES,
  summary,
  description,
  location,
  memberTokens,
}: {
  eventId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
  memberTokens: MemberCalendarTokens;
}): Promise<void> {
  const auth = buildAuthedClientFromTokens(memberTokens);
  await _updateCalendarEvent(auth, eventId, {
    date,
    time,
    durationMinutes,
    summary,
    description,
    location,
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const auth = await getAuthedClient();
  await _deleteCalendarEvent(auth, eventId);
}

export async function deleteCalendarEventForMember({
  eventId,
  memberTokens,
}: {
  eventId: string;
  memberTokens: MemberCalendarTokens;
}): Promise<void> {
  const auth = buildAuthedClientFromTokens(memberTokens);
  await _deleteCalendarEvent(auth, eventId);
}

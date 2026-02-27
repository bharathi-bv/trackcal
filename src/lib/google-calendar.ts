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
import { createServerClient } from "./supabase";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;
const DEFAULT_SLOT_MINUTES = 30;

type SlotSettings = {
  duration: number;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
  min_notice_hours?: number;
  max_days_in_advance?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
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
  };

  if (existing) {
    const { error } = await db
      .from("host_settings")
      .update(tokenData)
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to update host_settings: ${error.message}`);
  } else {
    const { error } = await db.from("host_settings").insert(tokenData);
    if (error) throw new Error(`Failed to insert host_settings: ${error.message}`);
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
    .update(tokenData)
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
function timeLabelToMinutes(label: string): number {
  const [timePart, period] = label.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// ── Internal: compute free slots for any auth client ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAvailableSlotsForAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any,
  date: string,
  settings: SlotSettings
): Promise<{ slots: string[]; hostTimezone: string }> {
  const calendar = google.calendar({ version: "v3", auth });

  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";

  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));
  const dayStart = `${date}T${String(settings.start_hour).padStart(2, "0")}:00:00${offsetStr}`;
  const dayEnd = `${date}T${String(settings.end_hour).padStart(2, "0")}:00:00${offsetStr}`;

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart,
      timeMax: dayEnd,
      items: [{ id: "primary" }],
    },
  });

  const busy = data.calendars?.primary?.busy ?? [];
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const available: string[] = [];

  for (
    let t = settings.start_hour * 60;
    t + settings.duration <= settings.end_hour * 60;
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

  return { slots: available, hostTimezone: tz };
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
  const auth = await getAuthedClient();
  return getAvailableSlotsForAuth(auth, date, settings);
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
    .select("id, google_access_token, google_refresh_token, google_token_expiry")
    .in("id", memberIds)
    .eq("is_active", true);

  const connected = (members ?? []).filter((m) => m.google_refresh_token);
  if (connected.length === 0) {
    return { slots: [], hostTimezone: "UTC" };
  }

  const results = await Promise.allSettled(
    connected.map((member) => {
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
  },
  date: string,
  time: string,
  durationMinutes: number
): Promise<boolean> {
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
      items: [{ id: "primary" }],
    },
  });

  const busy = data.calendars?.primary?.busy ?? [];
  return busy.length === 0;
}

// ── Internal: insert a calendar event using any auth client ──────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth });
  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";
  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));

  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary: summary || `${durationMinutes}-Minute Discovery Call with ${name}`,
      start: { dateTime: startDt.toISOString(), timeZone: tz },
      end: { dateTime: endDt.toISOString(), timeZone: tz },
      attendees: [{ email, displayName: name }],
      description: description || `Booked via TrackCal.\n\nAttendee: ${name} <${email}>`,
      ...(location ? { location } : {}),
      conferenceData: {
        createRequest: {
          requestId: `trackcal-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
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
}): Promise<void> {
  const auth = await getAuthedClient();
  await _insertCalendarEvent(auth, {
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
  memberTokens: {
    access_token: string | null;
    refresh_token: string;
    expiry: string | null;
    memberId: string;
  };
}): Promise<void> {
  const auth = buildAuthedClientFromTokens(memberTokens);
  await _insertCalendarEvent(auth, {
    date, time, name, email, durationMinutes, summary, description, location,
  });
}

/**
 * google-calendar.ts
 *
 * All Google Calendar logic lives here — same pattern as Cal.com's
 * packages/app-store/googlecalendar/lib/CalendarService.ts.
 *
 * Three responsibilities:
 * 1. OAuth — build the consent URL, exchange auth code for tokens
 * 2. Availability — query Google's freebusy API, return open 30-min slots
 * 3. Events — create a calendar event (sends email invite to the booker)
 *
 * Token storage: tokens are saved in the `host_settings` Supabase table.
 * For V1 we have a single host, so we always read/write the first row.
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
};

// ── OAuth client factory ────────────────────────────────────────────────────

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// ── Step 1: Build Google consent URL ───────────────────────────────────────

export function getAuthUrl(): string {
  const auth = getOAuth2Client();
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    // prompt: "consent" forces Google to return a refresh_token every time.
    // Without this, Google only returns refresh_token on the FIRST authorization.
    prompt: "consent",
  });
}

// ── Step 2: Exchange code for tokens, save to Supabase ─────────────────────

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
    // Store as plain text string — the column type must be `text`, not `timestamptz`.
    // Run: ALTER TABLE host_settings ALTER COLUMN google_token_expiry TYPE text;
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

// ── Build an authed OAuth2 client from stored tokens ───────────────────────

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
    // google_token_expiry is stored as a plain ms-since-epoch string
    expiry_date: data.google_token_expiry ? Number(data.google_token_expiry) : undefined,
  });

  // Persist refreshed tokens back to Supabase automatically
  auth.on("tokens", async (newTokens) => {
    const update: Record<string, string | null> = {
      google_access_token: newTokens.access_token ?? null,
      google_token_expiry: newTokens.expiry_date?.toString() ?? null,
    };
    if (newTokens.refresh_token) {
      update.google_refresh_token = newTokens.refresh_token;
    }
    const { data: row } = await createServerClient()
      .from("host_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (row) {
      await createServerClient()
        .from("host_settings")
        .update(update)
        .eq("id", row.id);
    }
  });

  return auth;
}

// ── Timezone helper ─────────────────────────────────────────────────────────

/**
 * Returns the UTC offset string (e.g. "+05:30") for a given IANA timezone
 * on a specific reference date. Using a reference date handles DST correctly —
 * the offset may differ between winter and summer for the same timezone.
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

// ── Availability: free 30-min slots for a given date ───────────────────────

export async function getAvailableSlots(
  date: string,
  settings: SlotSettings = {
    duration: DEFAULT_SLOT_MINUTES,
    start_hour: DEFAULT_START_HOUR,
    end_hour: DEFAULT_END_HOUR,
    slot_increment: DEFAULT_SLOT_MINUTES,
  }
): Promise<string[]> {
  const auth = await getAuthedClient();
  const calendar = google.calendar({ version: "v3", auth });

  // Fetch the host's primary calendar to get their IANA timezone name
  // (e.g. "Asia/Kolkata", "America/New_York"). This is the timezone their
  // Google Calendar is set to — it's what determines when their day starts.
  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";

  // Compute the UTC offset for this timezone on the requested date.
  // Using noon as reference handles DST edge cases (offset can differ
  // for morning vs evening on DST transition days).
  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));

  // Build the freebusy query window in the host's local time using event type hours.
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

  // Build each slot's start/end as UTC Date objects anchored to local midnight.
  // "local midnight" = midnight in the host's timezone, expressed as UTC.
  // Adding t*60*1000 ms to that gives us the correct UTC instant for each slot.
  //
  // Example (IST, UTC+5:30):
  //   localMidnight = Feb 26 00:00 IST = Feb 25 18:30 UTC
  //   t=840 (2 PM local) → Feb 25 18:30 UTC + 840 min = Feb 26 08:30 UTC = 2 PM IST ✓
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const available: string[] = [];

  // Loop condition ensures every slot fully fits within available hours.
  // e.g. 60-min slot with end_hour=17: last valid start = 16:00 (16*60+60 = 17*60 ✓)
  for (
    let t = settings.start_hour * 60;
    t + settings.duration <= settings.end_hour * 60;
    t += settings.slot_increment
  ) {
    const slotStart = new Date(localMidnight.getTime() + t * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + settings.duration * 60 * 1000);

    // freebusy busy[] are UTC Date objects — slotStart/slotEnd are also UTC → aligned
    const isBusy = busy.some((b) => {
      const busyStart = new Date(b.start!);
      const busyEnd = new Date(b.end!);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    // Reject slots that have already started (prevents booking in the past on today's date)
    const isInPast = slotStart <= new Date();

    if (!isBusy && !isInPast) {
      // Label shows host-local time (e.g. "02:00 PM" = 2 PM in host's timezone)
      available.push(minutesToLabel(t));
    }
  }

  return available;
}

// ── Create a Google Calendar event and send invites ────────────────────────

export async function createCalendarEvent({
  date,
  time,
  name,
  email,
  durationMinutes = DEFAULT_SLOT_MINUTES,
}: {
  date: string;
  time: string;
  name: string;
  email: string;
  durationMinutes?: number;
}): Promise<void> {
  const auth = await getAuthedClient();
  const calendar = google.calendar({ version: "v3", auth });

  // Get host timezone — same as availability so event lands at the right local time
  const { data: calData } = await calendar.calendars.get({ calendarId: "primary" });
  const tz = calData.timeZone ?? "UTC";
  const offsetStr = getOffsetString(tz, new Date(`${date}T12:00:00Z`));

  // Parse "02:00 PM" → 14, 0
  const [timePart, period] = time.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  // Build start/end anchored to local midnight — same logic as getAvailableSlots
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + (h * 60 + m) * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  // sendUpdates: "all" → Google emails calendar invites to all attendees
  await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: {
      summary: `30-Minute Discovery Call with ${name}`,
      start: { dateTime: startDt.toISOString(), timeZone: tz },
      end: { dateTime: endDt.toISOString(), timeZone: tz },
      attendees: [{ email, displayName: name }],
      description: `Booked via TrackCal.\n\nAttendee: ${name} <${email}>`,
    },
  });
}

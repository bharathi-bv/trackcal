import { createServerClient } from "./supabase";
import type { AvailabilityRange } from "./event-type-config";

const MICROSOFT_GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;
const DEFAULT_SLOT_MINUTES = 30;
const TOKEN_REFRESH_LEEWAY_MS = 60_000;
const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
];

type SlotSettings = {
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

export type ConnectedOutlookCalendar = {
  id: string;
  name: string;
  isPrimary: boolean;
};

type GraphEvent = {
  id?: string;
  isCancelled?: boolean;
  showAs?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
};

const WINDOWS_TZ_TO_IANA: Record<string, string> = {
  UTC: "UTC",
  "Dateline Standard Time": "Etc/GMT+12",
  "UTC-11": "Pacific/Pago_Pago",
  "Aleutian Standard Time": "America/Adak",
  "Hawaiian Standard Time": "Pacific/Honolulu",
  "Marquesas Standard Time": "Pacific/Marquesas",
  "Alaskan Standard Time": "America/Anchorage",
  "UTC-09": "Etc/GMT+9",
  "Pacific Standard Time (Mexico)": "America/Tijuana",
  "Pacific Standard Time": "America/Los_Angeles",
  "US Mountain Standard Time": "America/Phoenix",
  "Mountain Standard Time (Mexico)": "America/Chihuahua",
  "Mountain Standard Time": "America/Denver",
  "Central America Standard Time": "America/Guatemala",
  "Central Standard Time": "America/Chicago",
  "Easter Island Standard Time": "Pacific/Easter",
  "Central Standard Time (Mexico)": "America/Mexico_City",
  "Canada Central Standard Time": "America/Regina",
  "SA Pacific Standard Time": "America/Bogota",
  "Eastern Standard Time (Mexico)": "America/Cancun",
  "Eastern Standard Time": "America/New_York",
  "Haiti Standard Time": "America/Port-au-Prince",
  "Cuba Standard Time": "America/Havana",
  "US Eastern Standard Time": "America/Indianapolis",
  "Turks And Caicos Standard Time": "America/Grand_Turk",
  "Paraguay Standard Time": "America/Asuncion",
  "Atlantic Standard Time": "America/Halifax",
  "Venezuela Standard Time": "America/Caracas",
  "Central Brazilian Standard Time": "America/Cuiaba",
  "SA Western Standard Time": "America/La_Paz",
  "Pacific SA Standard Time": "America/Santiago",
  "Newfoundland Standard Time": "America/St_Johns",
  "Tocantins Standard Time": "America/Araguaina",
  "E. South America Standard Time": "America/Sao_Paulo",
  "SA Eastern Standard Time": "America/Cayenne",
  "Argentina Standard Time": "America/Buenos_Aires",
  "Greenland Standard Time": "America/Godthab",
  "Montevideo Standard Time": "America/Montevideo",
  "Magallanes Standard Time": "America/Punta_Arenas",
  "Saint Pierre Standard Time": "America/Miquelon",
  "Bahia Standard Time": "America/Bahia",
  "UTC-02": "Etc/GMT+2",
  Azores: "Atlantic/Azores",
  "Cape Verde Standard Time": "Atlantic/Cape_Verde",
  "GMT Standard Time": "Europe/London",
  "Greenwich Standard Time": "Atlantic/Reykjavik",
  "W. Europe Standard Time": "Europe/Berlin",
  "Central Europe Standard Time": "Europe/Budapest",
  "Romance Standard Time": "Europe/Paris",
  "Central European Standard Time": "Europe/Warsaw",
  "W. Central Africa Standard Time": "Africa/Lagos",
  "Jordan Standard Time": "Asia/Amman",
  "GTB Standard Time": "Europe/Bucharest",
  "Middle East Standard Time": "Asia/Beirut",
  "Egypt Standard Time": "Africa/Cairo",
  "E. Europe Standard Time": "Europe/Chisinau",
  "Syria Standard Time": "Asia/Damascus",
  "West Bank Standard Time": "Asia/Hebron",
  "South Africa Standard Time": "Africa/Johannesburg",
  "FLE Standard Time": "Europe/Kyiv",
  "Israel Standard Time": "Asia/Jerusalem",
  "Kaliningrad Standard Time": "Europe/Kaliningrad",
  "Sudan Standard Time": "Africa/Khartoum",
  "Libya Standard Time": "Africa/Tripoli",
  "Namibia Standard Time": "Africa/Windhoek",
  "Arabic Standard Time": "Asia/Baghdad",
  "Turkey Standard Time": "Europe/Istanbul",
  "Arab Standard Time": "Asia/Riyadh",
  "Belarus Standard Time": "Europe/Minsk",
  "Russian Standard Time": "Europe/Moscow",
  "E. Africa Standard Time": "Africa/Nairobi",
  "Iran Standard Time": "Asia/Tehran",
  "Arabian Standard Time": "Asia/Dubai",
  "Astrakhan Standard Time": "Europe/Astrakhan",
  "Azerbaijan Standard Time": "Asia/Baku",
  "Russia Time Zone 3": "Europe/Samara",
  "Mauritius Standard Time": "Indian/Mauritius",
  "Saratov Standard Time": "Europe/Saratov",
  "Georgian Standard Time": "Asia/Tbilisi",
  "Caucasus Standard Time": "Asia/Yerevan",
  "Afghanistan Standard Time": "Asia/Kabul",
  "West Asia Standard Time": "Asia/Tashkent",
  "Ekaterinburg Standard Time": "Asia/Yekaterinburg",
  "Pakistan Standard Time": "Asia/Karachi",
  "Qyzylorda Standard Time": "Asia/Qyzylorda",
  "India Standard Time": "Asia/Kolkata",
  "Sri Lanka Standard Time": "Asia/Colombo",
  "Nepal Standard Time": "Asia/Kathmandu",
  "Central Asia Standard Time": "Asia/Almaty",
  "Bangladesh Standard Time": "Asia/Dhaka",
  "Omsk Standard Time": "Asia/Omsk",
  "Myanmar Standard Time": "Asia/Yangon",
  "SE Asia Standard Time": "Asia/Bangkok",
  "Altai Standard Time": "Asia/Barnaul",
  "W. Mongolia Standard Time": "Asia/Hovd",
  "North Asia Standard Time": "Asia/Krasnoyarsk",
  "N. Central Asia Standard Time": "Asia/Novosibirsk",
  "Tomsk Standard Time": "Asia/Tomsk",
  "China Standard Time": "Asia/Shanghai",
  "North Asia East Standard Time": "Asia/Irkutsk",
  "Singapore Standard Time": "Asia/Singapore",
  "W. Australia Standard Time": "Australia/Perth",
  "Taipei Standard Time": "Asia/Taipei",
  "Ulaanbaatar Standard Time": "Asia/Ulaanbaatar",
  "Aus Central W. Standard Time": "Australia/Eucla",
  "Transbaikal Standard Time": "Asia/Chita",
  "Tokyo Standard Time": "Asia/Tokyo",
  "North Korea Standard Time": "Asia/Pyongyang",
  "Korea Standard Time": "Asia/Seoul",
  "Yakutsk Standard Time": "Asia/Yakutsk",
  "Cen. Australia Standard Time": "Australia/Adelaide",
  "AUS Central Standard Time": "Australia/Darwin",
  "E. Australia Standard Time": "Australia/Brisbane",
  "AUS Eastern Standard Time": "Australia/Sydney",
  "West Pacific Standard Time": "Pacific/Port_Moresby",
  "Tasmania Standard Time": "Australia/Hobart",
  "Vladivostok Standard Time": "Asia/Vladivostok",
  "Lord Howe Standard Time": "Australia/Lord_Howe",
  "Bougainville Standard Time": "Pacific/Bougainville",
  "Russia Time Zone 10": "Asia/Srednekolymsk",
  "Magadan Standard Time": "Asia/Magadan",
  "Norfolk Standard Time": "Pacific/Norfolk",
  "Sakhalin Standard Time": "Asia/Sakhalin",
  "Central Pacific Standard Time": "Pacific/Guadalcanal",
  "Russia Time Zone 11": "Asia/Kamchatka",
  "New Zealand Standard Time": "Pacific/Auckland",
  "UTC+12": "Etc/GMT-12",
  Fiji: "Pacific/Fiji",
  Chatham: "Pacific/Chatham",
  "UTC+13": "Etc/GMT-13",
  Tonga: "Pacific/Tongatapu",
  Samoa: "Pacific/Apia",
  "Line Islands Standard Time": "Pacific/Kiritimati",
};

function getMicrosoftTenantId() {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

function getMicrosoftRedirectUri() {
  return process.env.MICROSOFT_REDIRECT_URI!;
}

function getMicrosoftTokenEndpoint() {
  return `https://login.microsoftonline.com/${getMicrosoftTenantId()}/oauth2/v2.0/token`;
}

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

function timeLabelToMinutes(label: string): number {
  const [timePart, period] = label.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatUtcDateTime(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}

function parseUtcDateTime(value?: string | null) {
  if (!value) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value);
  return new Date(`${value}Z`);
}

function normalizeIanaTimezone(raw: string | null | undefined) {
  const candidate = raw?.trim();
  if (!candidate) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return WINDOWS_TZ_TO_IANA[candidate] || "UTC";
  }
}

async function exchangeMicrosoftToken(params: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    ...params,
  });

  const res = await fetch(getMicrosoftTokenEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Microsoft token exchange failed");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expiry: String(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}

async function saveHostMicrosoftTokens(tokens: {
  access_token: string | null;
  refresh_token?: string | null;
  expiry: string | null;
  calendar_ids?: string[];
  userId?: string;
}) {
  const db = createServerClient();
  const { data: existing } = await db
    .from("host_settings")
    .select("id, microsoft_calendar_ids")
    .limit(1)
    .maybeSingle();

  const tokenData = {
    microsoft_access_token: tokens.access_token ?? null,
    microsoft_token_expiry: tokens.expiry ?? null,
    calendar_provider: "microsoft",
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
    google_calendar_ids: [],
    microsoft_calendar_ids: tokens.calendar_ids ?? existing?.microsoft_calendar_ids ?? [],
    ...(tokens.refresh_token ? { microsoft_refresh_token: tokens.refresh_token } : {}),
  };

  if (existing) {
    const { error } = await db.from("host_settings").update(tokenData).eq("id", existing.id);
    if (error) throw new Error(`Failed to update host_settings: ${error.message}`);
  } else {
    const insertData = { ...tokenData, ...(tokens.userId ? { user_id: tokens.userId } : {}) };
    const { error } = await db.from("host_settings").insert(insertData);
    if (error) throw new Error(`Failed to insert host_settings: ${error.message}`);
  }
}

async function getHostMicrosoftTokens() {
  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry")
    .limit(1)
    .maybeSingle();

  if (!data?.microsoft_refresh_token) {
    throw new Error("Outlook Calendar not connected. Visit /api/auth/microsoft to connect.");
  }

  return {
    access_token: data.microsoft_access_token as string | null,
    refresh_token: data.microsoft_refresh_token as string,
    expiry: data.microsoft_token_expiry as string | null,
  };
}

async function refreshHostMicrosoftAccessToken(refreshToken: string) {
  const tokens = await exchangeMicrosoftToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    redirect_uri: getMicrosoftRedirectUri(),
    scope: MICROSOFT_SCOPES.join(" "),
  });

  await saveHostMicrosoftTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? refreshToken,
    expiry: tokens.expiry,
  });

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken,
  };
}

async function getValidHostMicrosoftAccessToken() {
  const tokens = await getHostMicrosoftTokens();
  const expiryMs = tokens.expiry ? Number(tokens.expiry) : 0;
  if (tokens.access_token && expiryMs > Date.now() + TOKEN_REFRESH_LEEWAY_MS) {
    return tokens.access_token;
  }

  const refreshed = await refreshHostMicrosoftAccessToken(tokens.refresh_token);
  return refreshed.accessToken;
}

async function graphFetch(
  path: string,
  init: RequestInit = {},
  attempt = 0
): Promise<Response> {
  const accessToken = await getValidHostMicrosoftAccessToken();
  const res = await fetch(
    path.startsWith("http") ? path : `${MICROSOFT_GRAPH_BASE}${path}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    }
  );

  if (res.status === 401 && attempt === 0) {
    const tokens = await getHostMicrosoftTokens();
    await refreshHostMicrosoftAccessToken(tokens.refresh_token);
    return graphFetch(path, init, 1);
  }

  return res;
}

async function graphJson<T>(path: string, init: RequestInit = {}) {
  const res = await graphFetch(path, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data?.error?.message || `Microsoft Graph request failed (${res.status})`);
  }
  return data;
}

async function listCalendarView(timeMinIso: string, timeMaxIso: string) {
  const preferHeader = { Prefer: 'outlook.timezone="UTC"' };
  let url =
    `${MICROSOFT_GRAPH_BASE}/me/calendarView?` +
    new URLSearchParams({
      startDateTime: timeMinIso,
      endDateTime: timeMaxIso,
      $select: "id,start,end,showAs,isCancelled",
      $top: "200",
    }).toString();

  const events: GraphEvent[] = [];
  while (url) {
    const res = await graphFetch(url, { headers: preferHeader });
    const data = (await res.json().catch(() => ({}))) as {
      value?: GraphEvent[];
      "@odata.nextLink"?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data?.error?.message || `Microsoft Graph calendarView failed (${res.status})`);
    }
    events.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? "";
  }

  return events;
}

async function listCalendarViewWithAccessToken(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string
) {
  const preferHeader = { Prefer: 'outlook.timezone="UTC"' };
  let url =
    `${MICROSOFT_GRAPH_BASE}/me/calendarView?` +
    new URLSearchParams({
      startDateTime: timeMinIso,
      endDateTime: timeMaxIso,
      $select: "id,start,end,showAs,isCancelled",
      $top: "200",
    }).toString();

  const events: GraphEvent[] = [];
  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...preferHeader,
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      value?: GraphEvent[];
      "@odata.nextLink"?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data?.error?.message || `Microsoft Graph calendarView failed (${res.status})`);
    }
    events.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? "";
  }

  return events;
}

async function listCalendarViewForCalendarId(
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string,
  accessToken?: string
) {
  const preferHeader = { Prefer: 'outlook.timezone="UTC"' };
  let url =
    `${MICROSOFT_GRAPH_BASE}/me/calendars/${encodeURIComponent(calendarId)}/calendarView?` +
    new URLSearchParams({
      startDateTime: timeMinIso,
      endDateTime: timeMaxIso,
      $select: "id,start,end,showAs,isCancelled",
      $top: "200",
    }).toString();

  const events: GraphEvent[] = [];
  while (url) {
    const res = accessToken
      ? await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...preferHeader,
          },
        })
      : await graphFetch(url, { headers: preferHeader });
    const data = (await res.json().catch(() => ({}))) as {
      value?: GraphEvent[];
      "@odata.nextLink"?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data?.error?.message || `Microsoft Graph calendarView failed (${res.status})`);
    }
    events.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? "";
  }

  return events;
}

async function getOutlookMailboxTimezone(accessToken?: string) {
  const data = accessToken
    ? await (async () => {
        const res = await fetch(`${MICROSOFT_GRAPH_BASE}/me/mailboxSettings?$select=timeZone`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = (await res.json().catch(() => ({}))) as { timeZone?: string; error?: { message?: string } };
        if (!res.ok) {
          throw new Error(json?.error?.message || `Microsoft Graph mailbox settings failed (${res.status})`);
        }
        return json;
      })()
    : await graphJson<{ timeZone?: string }>("/me/mailboxSettings?$select=timeZone");
  const raw = data.timeZone ?? "UTC";
  return {
    graphTimezone: raw,
    ianaTimezone: normalizeIanaTimezone(raw),
  };
}

async function listOutlookCalendarsWithAccessToken(accessToken: string): Promise<ConnectedOutlookCalendar[]> {
  let url =
    `${MICROSOFT_GRAPH_BASE}/me/calendars?` +
    new URLSearchParams({
      $select: "id,name,isDefaultCalendar",
      $top: "200",
    }).toString();

  const calendars: ConnectedOutlookCalendar[] = [];
  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      value?: Array<{ id?: string; name?: string; isDefaultCalendar?: boolean }>;
      "@odata.nextLink"?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data?.error?.message || `Microsoft Graph calendars failed (${res.status})`);
    }
    (data.value ?? []).forEach((calendar) => {
      if (!calendar.id) return;
      calendars.push({
        id: calendar.id,
        name: calendar.name || "Outlook Calendar",
        isPrimary: Boolean(calendar.isDefaultCalendar),
      });
    });
    url = data["@odata.nextLink"] ?? "";
  }

  return calendars;
}

export function getMicrosoftAuthUrl(state?: string) {
  const tenant = getMicrosoftTenantId();
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", getMicrosoftRedirectUri());
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPES.join(" "));
  url.searchParams.set("prompt", "consent");
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeMicrosoftCodeAndSave(code: string, userId?: string) {
  const tokens = await exchangeMicrosoftToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getMicrosoftRedirectUri(),
    scope: MICROSOFT_SCOPES.join(" "),
  });

  const calendars = await listOutlookCalendarsWithAccessToken(tokens.access_token);
  const defaultCalendarId = calendars.find((calendar) => calendar.isPrimary)?.id ?? calendars[0]?.id;
  await saveHostMicrosoftTokens({
    ...tokens,
    calendar_ids: defaultCalendarId ? [defaultCalendarId] : [],
    userId,
  });
}

export async function getAvailableSlotsOutlook(
  date: string,
  settings: SlotSettings = {
    duration: DEFAULT_SLOT_MINUTES,
    start_hour: DEFAULT_START_HOUR,
    end_hour: DEFAULT_END_HOUR,
    slot_increment: DEFAULT_SLOT_MINUTES,
  }
): Promise<{ slots: string[]; hostTimezone: string }> {
  const { data: host } = await createServerClient()
    .from("host_settings")
    .select("microsoft_calendar_ids")
    .limit(1)
    .maybeSingle();
  const calendarIds = host?.microsoft_calendar_ids?.length ? host.microsoft_calendar_ids : null;
  const { ianaTimezone } = await getOutlookMailboxTimezone();
  const offsetStr = getOffsetString(ianaTimezone, new Date(`${date}T12:00:00Z`));
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const dayStart = new Date(localMidnight.getTime() + settings.start_hour * 60 * 60 * 1000);
  const dayEnd = new Date(localMidnight.getTime() + settings.end_hour * 60 * 60 * 1000);
  const events = calendarIds
    ? (
        await Promise.all(
          calendarIds.map((calendarId: string) =>
            listCalendarViewForCalendarId(calendarId, dayStart.toISOString(), dayEnd.toISOString())
          )
        )
      ).flat()
    : await listCalendarView(dayStart.toISOString(), dayEnd.toISOString());

  const busy = events
    .filter((event) => !event.isCancelled && event.showAs !== "free")
    .map((event) => {
      const start = parseUtcDateTime(event.start?.dateTime);
      const end = parseUtcDateTime(event.end?.dateTime);
      return start && end ? { start, end } : null;
    })
    .filter((value): value is { start: Date; end: Date } => Boolean(value));

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

      const isBusy = busy.some(({ start, end }) => {
        const slotStartWithBuffer = new Date(
          slotStart.getTime() - (settings.buffer_before_minutes ?? 0) * 60 * 1000
        );
        const slotEndWithBuffer = new Date(
          slotEnd.getTime() + (settings.buffer_after_minutes ?? 0) * 60 * 1000
        );
        return slotStartWithBuffer < end && slotEndWithBuffer > start;
      });

      const isInPast = slotStart <= earliestAllowed;
      if (!isBusy && !isInPast) {
        available.push(minutesToLabel(t));
      }
    }
  }

  return { slots: [...new Set(available)], hostTimezone: ianaTimezone };
}

export async function createOutlookCalendarEvent({
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
  const { ianaTimezone } = await getOutlookMailboxTimezone();
  const offsetStr = getOffsetString(ianaTimezone, new Date(`${date}T12:00:00Z`));
  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  const data = await graphJson<{ id?: string }>("/me/events", {
    method: "POST",
    body: JSON.stringify({
      subject: summary || `${durationMinutes}-Minute Discovery Call with ${name}`,
      start: { dateTime: formatUtcDateTime(startDt), timeZone: "UTC" },
      end: { dateTime: formatUtcDateTime(endDt), timeZone: "UTC" },
      attendees: [
        {
          emailAddress: { address: email, name },
          type: "required",
        },
      ],
      body: {
        contentType: "text",
        content: description || `Booked via CitaCal.\n\nAttendee: ${name} <${email}>`,
      },
      ...(location ? { location: { displayName: location } } : {}),
      ...(!location
        ? {
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness",
          }
        : {}),
    }),
  });

  return data.id ?? null;
}

export async function updateOutlookCalendarEvent({
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
}) {
  const { ianaTimezone } = await getOutlookMailboxTimezone();
  const offsetStr = getOffsetString(ianaTimezone, new Date(`${date}T12:00:00Z`));
  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  await graphJson(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      start: { dateTime: formatUtcDateTime(startDt), timeZone: "UTC" },
      end: { dateTime: formatUtcDateTime(endDt), timeZone: "UTC" },
      ...(summary ? { subject: summary } : {}),
      ...(description ? { body: { contentType: "text", content: description } } : {}),
      ...(location ? { location: { displayName: location } } : {}),
    }),
  });
}

export async function deleteOutlookCalendarEvent(eventId: string) {
  const res = await graphFetch(`/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data?.error?.message || `Microsoft Graph delete failed (${res.status})`);
  }
}

async function deleteOutlookCalendarEventWithAccessToken(accessToken: string, eventId: string) {
  const res = await fetch(`${MICROSOFT_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data?.error?.message || `Microsoft Graph delete failed (${res.status})`);
  }
}

// ── Team member Microsoft OAuth ────────────────────────────────────────────

function getMicrosoftMemberRedirectUri() {
  return process.env.MICROSOFT_MEMBER_REDIRECT_URI!;
}

export function getMicrosoftAuthUrlForMember(memberId: string) {
  const tenant = getMicrosoftTenantId();
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", getMicrosoftMemberRedirectUri());
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPES.join(" "));
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", `member:${memberId}`);
  return url.toString();
}

async function saveMemberMicrosoftTokens(
  memberId: string,
  tokens: { access_token: string; refresh_token?: string | null; expiry: string; calendar_ids?: string[] }
) {
  const db = createServerClient();
  const { data: existing } = await db
    .from("team_members")
    .select("microsoft_calendar_ids")
    .eq("id", memberId)
    .maybeSingle();
  const payload: Record<string, string | string[] | null> = {
    microsoft_access_token: tokens.access_token,
    microsoft_token_expiry: tokens.expiry,
    // Clear Google tokens when connecting Microsoft
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
    google_calendar_ids: [],
    microsoft_calendar_ids: tokens.calendar_ids ?? existing?.microsoft_calendar_ids ?? [],
  };
  if (tokens.refresh_token) payload.microsoft_refresh_token = tokens.refresh_token;

  const { error } = await db
    .from("team_members")
    .update(payload)
    .eq("id", memberId);
  if (error) throw new Error(`Failed to save member MS tokens: ${error.message}`);
}

export async function exchangeMicrosoftCodeAndSaveForMember(code: string, memberId: string) {
  const tokens = await exchangeMicrosoftToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getMicrosoftMemberRedirectUri(),
    scope: MICROSOFT_SCOPES.join(" "),
  });
  const calendars = await listOutlookCalendarsWithAccessToken(tokens.access_token);
  const defaultCalendarId = calendars.find((calendar) => calendar.isPrimary)?.id ?? calendars[0]?.id;
  await saveMemberMicrosoftTokens(memberId, {
    ...tokens,
    calendar_ids: defaultCalendarId ? [defaultCalendarId] : [],
  });
}

async function refreshMemberMicrosoftToken(memberId: string, refreshToken: string) {
  const tokens = await exchangeMicrosoftToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    redirect_uri: getMicrosoftMemberRedirectUri(),
    scope: MICROSOFT_SCOPES.join(" "),
  });
  await saveMemberMicrosoftTokens(memberId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? refreshToken,
    expiry: tokens.expiry,
  });
  return tokens.access_token;
}

export async function getValidMemberMicrosoftAccessToken(member: {
  id: string;
  microsoft_access_token?: string | null;
  microsoft_refresh_token?: string | null;
  microsoft_token_expiry?: string | null;
}) {
  if (!member.microsoft_refresh_token) throw new Error("Member Microsoft calendar not connected.");
  const expiryMs = member.microsoft_token_expiry ? Number(member.microsoft_token_expiry) : 0;
  if (member.microsoft_access_token && expiryMs > Date.now() + TOKEN_REFRESH_LEEWAY_MS) {
    return member.microsoft_access_token;
  }
  return refreshMemberMicrosoftToken(member.id, member.microsoft_refresh_token);
}

export async function isMemberAvailableOutlook(
  member: {
    id: string;
    microsoft_access_token?: string | null;
    microsoft_refresh_token?: string | null;
    microsoft_token_expiry?: string | null;
    microsoft_calendar_ids?: string[] | null;
  },
  slotStart: Date,
  slotEnd: Date,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0
): Promise<boolean> {
  try {
    const accessToken = await getValidMemberMicrosoftAccessToken(member);
    const windowStart = new Date(slotStart.getTime() - bufferBeforeMinutes * 60000);
    const windowEnd = new Date(slotEnd.getTime() + bufferAfterMinutes * 60000);
    const calendarIds = member.microsoft_calendar_ids?.length ? member.microsoft_calendar_ids : null;
    const events = calendarIds
      ? (
          await Promise.all(
            calendarIds.map((calendarId: string) =>
              listCalendarViewForCalendarId(
                calendarId,
                windowStart.toISOString().replace(/\.\d{3}Z$/, ""),
                windowEnd.toISOString().replace(/\.\d{3}Z$/, ""),
                accessToken
              )
            )
          )
        ).flat()
      : await listCalendarViewWithAccessToken(
          accessToken,
          windowStart.toISOString().replace(/\.\d{3}Z$/, ""),
          windowEnd.toISOString().replace(/\.\d{3}Z$/, "")
        );
    const busy = events.filter((e) => !e.isCancelled && e.showAs !== "free");
    return busy.length === 0;
  } catch {
    return true; // soft-fail: assume available
  }
}

export async function listHostOutlookCalendars() {
  const accessToken = await getValidHostMicrosoftAccessToken();
  return listOutlookCalendarsWithAccessToken(accessToken);
}

export async function listMemberOutlookCalendars(member: {
  id: string;
  microsoft_access_token?: string | null;
  microsoft_refresh_token?: string | null;
  microsoft_token_expiry?: string | null;
}) {
  const accessToken = await getValidMemberMicrosoftAccessToken(member);
  return listOutlookCalendarsWithAccessToken(accessToken);
}

export async function getAvailableSlotsOutlookForMember(
  member: {
    id: string;
    microsoft_access_token?: string | null;
    microsoft_refresh_token?: string | null;
    microsoft_token_expiry?: string | null;
    microsoft_calendar_ids?: string[] | null;
  },
  date: string,
  settings: SlotSettings = {
    duration: DEFAULT_SLOT_MINUTES,
    start_hour: DEFAULT_START_HOUR,
    end_hour: DEFAULT_END_HOUR,
    slot_increment: DEFAULT_SLOT_MINUTES,
  }
): Promise<{ slots: string[]; hostTimezone: string }> {
  const accessToken = await getValidMemberMicrosoftAccessToken(member);
  const { ianaTimezone } = await getOutlookMailboxTimezone(accessToken);
  const offsetStr = getOffsetString(ianaTimezone, new Date(`${date}T12:00:00Z`));
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const dayStart = new Date(localMidnight.getTime() + settings.start_hour * 60 * 60 * 1000);
  const dayEnd = new Date(localMidnight.getTime() + settings.end_hour * 60 * 60 * 1000);
  const calendarIds = member.microsoft_calendar_ids?.length ? member.microsoft_calendar_ids : null;
  const events = calendarIds
    ? (
        await Promise.all(
          calendarIds.map((calendarId: string) =>
            listCalendarViewForCalendarId(calendarId, dayStart.toISOString(), dayEnd.toISOString(), accessToken)
          )
        )
      ).flat()
    : await listCalendarViewWithAccessToken(accessToken, dayStart.toISOString(), dayEnd.toISOString());

  const busy = events
    .filter((event) => !event.isCancelled && event.showAs !== "free")
    .map((event) => {
      const start = parseUtcDateTime(event.start?.dateTime);
      const end = parseUtcDateTime(event.end?.dateTime);
      return start && end ? { start, end } : null;
    })
    .filter((value): value is { start: Date; end: Date } => Boolean(value));

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

      const isBusy = busy.some(({ start, end }) => {
        const slotStartWithBuffer = new Date(
          slotStart.getTime() - (settings.buffer_before_minutes ?? 0) * 60 * 1000
        );
        const slotEndWithBuffer = new Date(
          slotEnd.getTime() + (settings.buffer_after_minutes ?? 0) * 60 * 1000
        );
        return slotStartWithBuffer < end && slotEndWithBuffer > start;
      });

      if (!isBusy && slotStart > earliestAllowed) {
        available.push(minutesToLabel(t));
      }
    }
  }

  return { slots: [...new Set(available)], hostTimezone: ianaTimezone };
}

export async function createOutlookCalendarEventForMember({
  date,
  time,
  name,
  email,
  durationMinutes = DEFAULT_SLOT_MINUTES,
  summary,
  description,
  location,
  member,
}: {
  date: string;
  time: string;
  name: string;
  email: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
  member: {
    id: string;
    microsoft_access_token?: string | null;
    microsoft_refresh_token?: string | null;
    microsoft_token_expiry?: string | null;
  };
}): Promise<string | null> {
  const accessToken = await getValidMemberMicrosoftAccessToken(member);
  const { ianaTimezone } = await getOutlookMailboxTimezone(accessToken);
  const offsetStr = getOffsetString(ianaTimezone, new Date(`${date}T12:00:00Z`));
  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  const res = await fetch(`${MICROSOFT_GRAPH_BASE}/me/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: summary || `${durationMinutes}-Minute Discovery Call with ${name}`,
      start: { dateTime: formatUtcDateTime(startDt), timeZone: "UTC" },
      end: { dateTime: formatUtcDateTime(endDt), timeZone: "UTC" },
      attendees: [
        {
          emailAddress: { address: email, name },
          type: "required",
        },
      ],
      body: {
        contentType: "text",
        content: description || `Booked via CitaCal.\n\nAttendee: ${name} <${email}>`,
      },
      ...(location ? { location: { displayName: location } } : {}),
      ...(!location
        ? {
            isOnlineMeeting: true,
            onlineMeetingProvider: "teamsForBusiness",
          }
        : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data?.error?.message || `Microsoft Graph create failed (${res.status})`);
  }
  return data.id ?? null;
}

export async function updateOutlookCalendarEventForMember({
  eventId,
  date,
  time,
  durationMinutes = DEFAULT_SLOT_MINUTES,
  summary,
  description,
  location,
  member,
}: {
  eventId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  summary?: string;
  description?: string;
  location?: string;
  member: {
    id: string;
    microsoft_access_token?: string | null;
    microsoft_refresh_token?: string | null;
    microsoft_token_expiry?: string | null;
  };
}) {
  const accessToken = await getValidMemberMicrosoftAccessToken(member);
  const { ianaTimezone } = await getOutlookMailboxTimezone(accessToken);
  const offsetStr = getOffsetString(ianaTimezone, new Date(`${date}T12:00:00Z`));
  const totalMins = timeLabelToMinutes(time);
  const localMidnight = new Date(`${date}T00:00:00${offsetStr}`);
  const startDt = new Date(localMidnight.getTime() + totalMins * 60 * 1000);
  const endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);

  const res = await fetch(`${MICROSOFT_GRAPH_BASE}/me/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: { dateTime: formatUtcDateTime(startDt), timeZone: "UTC" },
      end: { dateTime: formatUtcDateTime(endDt), timeZone: "UTC" },
      ...(summary ? { subject: summary } : {}),
      ...(description ? { body: { contentType: "text", content: description } } : {}),
      ...(location ? { location: { displayName: location } } : {}),
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(data?.error?.message || `Microsoft Graph update failed (${res.status})`);
  }
}

export async function deleteOutlookCalendarEventForMember({
  eventId,
  member,
}: {
  eventId: string;
  member: {
    id: string;
    microsoft_access_token?: string | null;
    microsoft_refresh_token?: string | null;
    microsoft_token_expiry?: string | null;
  };
}) {
  const accessToken = await getValidMemberMicrosoftAccessToken(member);
  await deleteOutlookCalendarEventWithAccessToken(accessToken, eventId);
}

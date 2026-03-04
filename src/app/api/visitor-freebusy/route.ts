import { NextRequest, NextResponse } from "next/server";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATES = 14;

type BusyInterval = { start: string; end: string };
type RequestBody = {
  provider: "google" | "outlook";
  access_token: string;
  dates: string[];
  calendar_ids?: string[];
};

/** Split raw busy intervals into per-date buckets (intervals may span midnight). */
function bucketByDate(
  rawBusy: BusyInterval[],
  validDates: string[]
): Record<string, BusyInterval[]> {
  const byDate: Record<string, BusyInterval[]> = {};
  validDates.forEach((d) => { byDate[d] = []; });

  for (const interval of rawBusy) {
    const start = new Date(interval.start);
    const end = new Date(interval.end);
    for (const d of validDates) {
      const dayStart = new Date(`${d}T00:00:00Z`);
      const dayEnd = new Date(`${d}T23:59:59.999Z`);
      if (end > dayStart && start < dayEnd) {
        byDate[d].push({ start: interval.start, end: interval.end });
      }
    }
  }
  return byDate;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { provider, access_token, dates } = body;
  const calendarIds =
    Array.isArray(body.calendar_ids) && body.calendar_ids.length > 0
      ? body.calendar_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

  // Validate token
  if (typeof access_token !== "string" || access_token.length === 0 || access_token.length > 4096) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  // Validate and sanitize dates
  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "dates_required" }, { status: 400 });
  }
  const validDates = dates
    .filter((d): d is string => typeof d === "string" && ISO_DATE_RE.test(d))
    .slice(0, MAX_DATES)
    .sort();

  if (validDates.length === 0) {
    return NextResponse.json({ error: "no_valid_dates" }, { status: 400 });
  }

  const timeMin = `${validDates[0]}T00:00:00Z`;
  const timeMax = `${validDates[validDates.length - 1]}T23:59:59Z`;

  // ── Google ──────────────────────────────────────────────────────────────
  if (provider === "google") {
    const gcalRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: (calendarIds.length > 0 ? calendarIds : ["primary"]).map((id) => ({ id })),
      }),
    });

    if (gcalRes.status === 401) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }
    if (!gcalRes.ok) {
      return NextResponse.json({ error: "freebusy_api_failed" }, { status: 502 });
    }

    const gcalData = (await gcalRes.json()) as {
      calendars?: Record<string, { busy?: BusyInterval[] }>;
    };

    const rawBusy: BusyInterval[] = Object.values(gcalData.calendars ?? {}).flatMap(
      (calendar) => calendar.busy ?? []
    );

    return NextResponse.json({
      busy: bucketByDate(rawBusy, validDates),
      calendarNames: calendarIds,
    });
  }

  // ── Outlook ─────────────────────────────────────────────────────────────
  if (provider === "outlook") {
    // Use calendarView to get events — filter for non-free entries.
    // The Prefer header forces all datetimes to UTC so conversion is trivial.
    const urls =
      calendarIds.length > 0
        ? calendarIds.map(
            (calendarId) =>
              `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/calendarView` +
              `?startDateTime=${timeMin}&endDateTime=${timeMax}` +
              `&$select=start,end,showAs&$top=200`
          )
        : [
            `https://graph.microsoft.com/v1.0/me/calendarView` +
              `?startDateTime=${timeMin}&endDateTime=${timeMax}` +
              `&$select=start,end,showAs&$top=200`,
          ];

    let eventSets: Array<
      Array<{
        start: { dateTime: string; timeZone: string };
        end: { dateTime: string; timeZone: string };
        showAs: string;
      }>
    > = [];
    try {
      eventSets = await Promise.all(
        urls.map(async (url) => {
          const msRes = await fetch(url, {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
              Prefer: 'outlook.timezone="UTC"',
            },
          });

          if (msRes.status === 401) {
            throw new Error("token_expired");
          }
          if (!msRes.ok) {
            throw new Error("freebusy_api_failed");
          }

          const msData = (await msRes.json()) as {
            value?: Array<{
              start: { dateTime: string; timeZone: string };
              end: { dateTime: string; timeZone: string };
              showAs: string;
            }>;
          };
          return msData.value ?? [];
        })
      );
    } catch (error) {
      if (error instanceof Error && error.message === "token_expired") {
        return NextResponse.json({ error: "token_expired" }, { status: 401 });
      }
      return NextResponse.json({ error: "freebusy_api_failed" }, { status: 502 });
    }

    const rawBusy: BusyInterval[] = eventSets
      .flat()
      .filter((e) => e.showAs !== "free")
      .map((e) => ({
        start: e.start.dateTime.endsWith("Z") ? e.start.dateTime : `${e.start.dateTime}Z`,
        end: e.end.dateTime.endsWith("Z") ? e.end.dateTime : `${e.end.dateTime}Z`,
      }));

    return NextResponse.json({
      busy: bucketByDate(rawBusy, validDates),
      calendarNames: calendarIds,
    });
  }

  return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
}

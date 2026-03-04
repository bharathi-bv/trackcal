import { NextRequest, NextResponse } from "next/server";

type RequestBody = {
  provider: "google" | "outlook";
  access_token: string;
};

type CalendarOption = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { provider, access_token } = body;
  if (typeof access_token !== "string" || access_token.length === 0 || access_token.length > 4096) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  if (provider === "google") {
    const calendars: CalendarOption[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ maxResults: "250" });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      if (res.status === 401) {
        return NextResponse.json({ error: "token_expired" }, { status: 401 });
      }
      if (!res.ok) {
        return NextResponse.json({ error: "calendar_list_failed" }, { status: 502 });
      }
      const data = (await res.json().catch(() => ({}))) as {
        items?: Array<{ id?: string; summary?: string; primary?: boolean }>;
        nextPageToken?: string;
      };
      (data.items ?? []).forEach((calendar) => {
        if (!calendar.id) return;
        calendars.push({
          id: calendar.id,
          name: calendar.summary || calendar.id,
          isPrimary: Boolean(calendar.primary),
        });
      });
      pageToken = data.nextPageToken;
    } while (pageToken);

    const defaultIds =
      calendars.find((calendar) => calendar.isPrimary)?.id
        ? [calendars.find((calendar) => calendar.isPrimary)!.id]
        : calendars[0]?.id
          ? [calendars[0].id]
          : [];

    return NextResponse.json({ calendars, defaultCalendarIds: defaultIds });
  }

  if (provider === "outlook") {
    const calendars: CalendarOption[] = [];
    let url =
      "https://graph.microsoft.com/v1.0/me/calendars?" +
      new URLSearchParams({
        $select: "id,name,isDefaultCalendar",
        $top: "200",
      }).toString();

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (res.status === 401) {
        return NextResponse.json({ error: "token_expired" }, { status: 401 });
      }
      if (!res.ok) {
        return NextResponse.json({ error: "calendar_list_failed" }, { status: 502 });
      }
      const data = (await res.json().catch(() => ({}))) as {
        value?: Array<{ id?: string; name?: string; isDefaultCalendar?: boolean }>;
        "@odata.nextLink"?: string;
      };
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

    const defaultIds =
      calendars.find((calendar) => calendar.isPrimary)?.id
        ? [calendars.find((calendar) => calendar.isPrimary)!.id]
        : calendars[0]?.id
          ? [calendars[0].id]
          : [];

    return NextResponse.json({ calendars, defaultCalendarIds: defaultIds });
  }

  return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
}

/**
 * GET /api/calendar-freebusy?weekStart=YYYY-MM-DD
 *
 * Returns busy intervals for all connected calendar accounts for the given week.
 * Used by the weekly availability view in the Calendar settings tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase";
import { getCalendarAccounts } from "@/lib/calendar-accounts";

type BusyInterval = { start: string; end: string };

async function getGoogleBusy(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<BusyInterval[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: calendarIds.map((id) => ({ id })),
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  const busy: BusyInterval[] = [];
  for (const calId of calendarIds) {
    for (const interval of data.calendars?.[calId]?.busy ?? []) {
      busy.push({ start: interval.start, end: interval.end });
    }
  }
  return busy;
}

async function getMicrosoftBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<BusyInterval[]> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", timeMin.replace("Z", ""));
  url.searchParams.set("endDateTime", timeMax.replace("Z", ""));
  url.searchParams.set("$select", "start,end,showAs,isCancelled");
  url.searchParams.set("$top", "200");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    value?: Array<{
      isCancelled?: boolean;
      showAs?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }>;
  };

  const busy: BusyInterval[] = [];
  for (const event of data.value ?? []) {
    if (event.isCancelled || event.showAs === "free") continue;
    const s = event.start?.dateTime;
    const e = event.end?.dateTime;
    if (!s || !e) continue;
    busy.push({
      start: s.endsWith("Z") ? s : `${s}Z`,
      end: e.endsWith("Z") ? e : `${e}Z`,
    });
  }
  return busy;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = req.nextUrl.searchParams.get("weekStart");
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const timeMin = new Date(`${weekStart}T00:00:00Z`);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 7);

  const db = createServerClient();
  const accounts = await getCalendarAccounts(db).catch(() => []);

  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        const busy =
          account.provider === "google"
            ? await getGoogleBusy(
                account.access_token ?? "",
                account.calendar_ids.length ? account.calendar_ids : ["primary"],
                timeMin.toISOString(),
                timeMax.toISOString()
              )
            : await getMicrosoftBusy(
                account.access_token ?? "",
                timeMin.toISOString(),
                timeMax.toISOString()
              );
        return { accountId: account.id, busy };
      } catch {
        return { accountId: account.id, busy: [] };
      }
    })
  );

  return NextResponse.json({ accounts: results });
}

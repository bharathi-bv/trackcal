/**
 * GET /api/calendar-freebusy?weekStart=YYYY-MM-DD
 *
 * Returns busy intervals for all connected calendar accounts for the given week.
 * Used by the weekly availability view in the Calendar settings tab.
 *
 * Handles token refresh automatically for expired access tokens.
 * Falls back to host_settings if no calendar_accounts rows exist (legacy connections).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { createServerClient } from "@/lib/supabase";
import { getCalendarAccounts, type CalendarAccount } from "@/lib/calendar-accounts";

type BusyInterval = { start: string; end: string };

const TOKEN_LEEWAY_MS = 5 * 60 * 1000; // refresh if expiring within 5 min

// ── Token refresh helpers ─────────────────────────────────────────────────────

async function getValidGoogleToken(account: CalendarAccount, db: ReturnType<typeof createServerClient>): Promise<string> {
  const expiryMs = account.token_expiry ? Number(account.token_expiry) : 0;
  if (account.access_token && expiryMs > Date.now() + TOKEN_LEEWAY_MS) {
    return account.access_token;
  }
  // Refresh via googleapis OAuth2
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials({ refresh_token: account.refresh_token });
  const { credentials } = await oauth2.refreshAccessToken();
  if (!credentials.access_token) throw new Error("Google refresh failed");

  await db.from("calendar_accounts").update({
    access_token: credentials.access_token,
    token_expiry: credentials.expiry_date?.toString() ?? null,
  }).eq("id", account.id);

  return credentials.access_token;
}

// ── Busy-time fetchers ────────────────────────────────────────────────────────

async function getGoogleBusy(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<BusyInterval[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, items: calendarIds.map((id) => ({ id })) }),
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
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' },
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
    busy.push({ start: s.endsWith("Z") ? s : `${s}Z`, end: e.endsWith("Z") ? e : `${e}Z` });
  }
  return busy;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = req.nextUrl.searchParams.get("weekStart");
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const timeMin = new Date(`${weekStart}T00:00:00Z`);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 7);
  const timeMinISO = timeMin.toISOString();
  const timeMaxISO = timeMax.toISOString();

  const db = createServerClient();
  let accounts = await getCalendarAccounts(db).catch(() => [] as CalendarAccount[]);

  // Supplement with host_settings tokens for any provider not already covered by calendar_accounts.
  // This handles the case where e.g. Google is in calendar_accounts but Outlook is only in host_settings.
  const hasGoogle = accounts.some((a) => a.provider === "google");
  const hasMicrosoft = accounts.some((a) => a.provider === "microsoft");

  if (!hasGoogle || !hasMicrosoft) {
    const { data: host } = await db
      .from("host_settings")
      .select("google_access_token, google_refresh_token, google_token_expiry, google_calendar_ids, microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry")
      .limit(1)
      .maybeSingle();

    if (!hasGoogle && host?.google_refresh_token) {
      accounts = [...accounts, {
        id: "legacy-google",
        provider: "google",
        email: null,
        access_token: host.google_access_token as string | null,
        refresh_token: host.google_refresh_token as string,
        token_expiry: host.google_token_expiry as string | null,
        calendar_ids: (host.google_calendar_ids as string[] | null) ?? ["primary"],
        is_write_calendar: true,
        created_at: "",
      }];
    }
    if (!hasMicrosoft && host?.microsoft_refresh_token) {
      accounts = [...accounts, {
        id: "legacy-microsoft",
        provider: "microsoft",
        email: null,
        access_token: host.microsoft_access_token as string | null,
        refresh_token: host.microsoft_refresh_token as string,
        token_expiry: host.microsoft_token_expiry as string | null,
        calendar_ids: [],
        is_write_calendar: false,
        created_at: "",
      }];
    }
  }

  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        let token: string;
        if (account.provider === "google") {
          // For legacy accounts not in calendar_accounts, refresh via OAuth but don't save to DB
          if (account.id.startsWith("legacy-")) {
            const oauth2 = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET,
              process.env.GOOGLE_REDIRECT_URI
            );
            const expiryMs = account.token_expiry ? Number(account.token_expiry) : 0;
            if (account.access_token && expiryMs > Date.now() + TOKEN_LEEWAY_MS) {
              token = account.access_token;
            } else {
              oauth2.setCredentials({ refresh_token: account.refresh_token });
              const { credentials } = await oauth2.refreshAccessToken();
              if (!credentials.access_token) throw new Error("Google refresh failed");
              // Save refreshed token back to host_settings
              await db.from("host_settings").update({
                google_access_token: credentials.access_token,
                google_token_expiry: credentials.expiry_date?.toString() ?? null,
              }).neq("google_refresh_token", "");
              token = credentials.access_token;
            }
          } else {
            token = await getValidGoogleToken(account, db);
          }
          const calendarIds = account.calendar_ids.length ? account.calendar_ids : ["primary"];
          const busy = await getGoogleBusy(token, calendarIds, timeMinISO, timeMaxISO);
          return { accountId: account.id, busy };
        } else {
          // Always use the canonical host token path — it uses the correct scopes
          // and host_settings is always kept in sync by the OAuth callback.
          const { getValidHostMicrosoftAccessToken } = await import("@/lib/outlook-calendar");
          token = await getValidHostMicrosoftAccessToken();
          const busy = await getMicrosoftBusy(token, timeMinISO, timeMaxISO);
          return { accountId: account.id, busy };
        }
      } catch {
        return { accountId: account.id, busy: [] };
      }
    })
  );

  return NextResponse.json({ accounts: results });
}

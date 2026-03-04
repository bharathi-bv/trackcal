/**
 * Google Sheets integration — separate OAuth scope from Calendar.
 *
 * Scopes: https://www.googleapis.com/auth/spreadsheets
 *
 * All token operations use the service_role Supabase client and touch
 * only the host_settings row (sheet_access_token, sheet_refresh_token,
 * sheet_token_expiry, sheet_id).
 *
 * COLUMN_DEFS defines every column that gets written.  Adding a new field
 * = add one entry here.  On the next booking the header row is checked,
 * the new column is appended automatically, and the value is written.
 */

import { createServerClient } from "@/lib/supabase";

// ── OAuth ──────────────────────────────────────────────────────────────────────

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL    = "https://oauth2.googleapis.com/token";

export function getSheetAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_SHEETS_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_SHEETS_REDIRECT_URI!,
    response_type: "code",
    scope:         SHEETS_SCOPE,
    access_type:   "offline",
    prompt:        "consent",          // always return refresh_token
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeSheetCodeAndSave(code: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_SHEETS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_SHEETS_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_SHEETS_REDIRECT_URI!,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Sheet token exchange failed: ${await res.text()}`);

  const json = await res.json();
  const expiry = String(Date.now() + json.expires_in * 1000);

  const db = createServerClient();
  await db
    .from("host_settings")
    .update({
      sheet_access_token:  json.access_token,
      sheet_refresh_token: json.refresh_token ?? undefined, // undefined = don't overwrite
      sheet_token_expiry:  expiry,
    })
    .eq("id", (await db.from("host_settings").select("id").limit(1).single()).data!.id);
}

async function refreshSheetToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_SHEETS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_SHEETS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Sheet token refresh failed: ${await res.text()}`);

  const json = await res.json();
  const expiry = String(Date.now() + json.expires_in * 1000);

  const db = createServerClient();
  await db
    .from("host_settings")
    .update({ sheet_access_token: json.access_token, sheet_token_expiry: expiry })
    .eq("id", (await db.from("host_settings").select("id").limit(1).single()).data!.id);

  return json.access_token as string;
}

/** Returns a valid access token, refreshing if within 60 s of expiry. */
export async function getValidSheetToken(): Promise<string | null> {
  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("sheet_access_token, sheet_refresh_token, sheet_token_expiry")
    .limit(1)
    .maybeSingle();

  if (!data?.sheet_refresh_token) return null;

  const expiry = Number(data.sheet_token_expiry ?? "0");
  if (Date.now() < expiry - 60_000 && data.sheet_access_token) {
    return data.sheet_access_token;
  }

  return refreshSheetToken(data.sheet_refresh_token);
}

// ── Sheet ID extraction ────────────────────────────────────────────────────────

/**
 * Extracts the spreadsheet ID from any Google Sheets URL format:
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
 *   https://drive.google.com/file/d/SHEET_ID/view
 *   Just the raw ID itself
 */
export function extractSheetId(urlOrId: string): string | null {
  // Try /d/{id}/ pattern (covers both docs.google.com and drive.google.com)
  const match = urlOrId.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (match) return match[1];
  // Bare spreadsheet ID (44 char base64url)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId.trim())) return urlOrId.trim();
  return null;
}

// ── Column definitions ────────────────────────────────────────────────────────
//
// ADD NEW COLUMNS HERE.  On the next booking the header row is checked;
// if the column is missing it is automatically appended to row 1.
// Do NOT reorder or rename existing entries — the column index in the sheet
// is determined by the order they appear in row 1.

type BookingRecord = {
  id: string;
  created_at: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  status: string;
  event_slug: string | null;
  assigned_to: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  li_fat_id: string | null;
  ttclid: string | null;
  msclkid: string | null;
  zoom_meeting_id: string | null;
  custom_answers: Record<string, string | string[]> | null;
};

const COLUMN_DEFS: { header: string; value: (b: BookingRecord) => string }[] = [
  { header: "Booking ID",   value: (b) => b.id },
  { header: "Date",         value: (b) => b.date },
  { header: "Time",         value: (b) => b.time },
  { header: "Name",         value: (b) => b.name },
  { header: "Email",        value: (b) => b.email },
  { header: "Phone",        value: (b) => b.phone ?? "" },
  { header: "Notes",        value: (b) => b.notes ?? "" },
  { header: "Status",       value: (b) => b.status },
  { header: "Meeting Link", value: (b) => b.event_slug ?? "" },
  { header: "Assigned To",  value: (b) => b.assigned_to ?? "" },
  { header: "Created At",   value: (b) => b.created_at },
  { header: "UTM Source",   value: (b) => b.utm_source ?? "" },
  { header: "UTM Medium",   value: (b) => b.utm_medium ?? "" },
  { header: "UTM Campaign", value: (b) => b.utm_campaign ?? "" },
  { header: "UTM Term",     value: (b) => b.utm_term ?? "" },
  { header: "UTM Content",  value: (b) => b.utm_content ?? "" },
  { header: "GCLID",        value: (b) => b.gclid ?? "" },
  { header: "FBCLID",       value: (b) => b.fbclid ?? "" },
  { header: "LI FAT ID",    value: (b) => b.li_fat_id ?? "" },
  { header: "TTCLID",       value: (b) => b.ttclid ?? "" },
  { header: "MSCLKID",      value: (b) => b.msclkid ?? "" },
  { header: "Zoom Meeting ID", value: (b) => b.zoom_meeting_id ?? "" },
  { header: "Custom Answers",  value: (b) => b.custom_answers ? JSON.stringify(b.custom_answers) : "" },
];

// ── Sheets API helpers ────────────────────────────────────────────────────────

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

async function sheetsGet(token: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets GET failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function sheetsPost(token: string, url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sheets POST failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ── Core operations ───────────────────────────────────────────────────────────

const DEFAULT_SHEET_NAME = "Bookings list";

/**
 * Ensures the target sheet tab exists and has the correct headers.
 * If the sheet tab doesn't exist it is created.
 * If new columns are in COLUMN_DEFS that aren't in row 1 yet, they are appended.
 */
export async function ensureHeaders(token: string, sheetId: string): Promise<void> {
  // 1. Get spreadsheet metadata to find the sheet tab
  const meta = await sheetsGet(token, `${SHEETS_BASE}/${sheetId}?fields=sheets.properties`);
  const sheets: { properties: { sheetId: number; title: string } }[] = meta.sheets ?? [];

  let sheetTabExists = sheets.some((s) => s.properties.title === DEFAULT_SHEET_NAME);

  // 2. Create the sheet tab if missing
  if (!sheetTabExists) {
    await sheetsPost(token, `${SHEETS_BASE}/${sheetId}:batchUpdate`, {
      requests: [{ addSheet: { properties: { title: DEFAULT_SHEET_NAME } } }],
    });
    sheetTabExists = true;
  }

  // 3. Read existing headers from row 1
  const range = `'${DEFAULT_SHEET_NAME}'!A1:ZZ1`;
  const data = await sheetsGet(token, `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}`);
  const existingHeaders: string[] = (data.values?.[0] as string[] | undefined) ?? [];

  // 4. Append any new columns that COLUMN_DEFS defines but row 1 doesn't have yet
  const missing = COLUMN_DEFS.map((c) => c.header).filter((h) => !existingHeaders.includes(h));
  if (missing.length === 0) return;

  const startCol = existingHeaders.length; // 0-based index
  const startColLetter = colLetter(startCol);
  const endColLetter   = colLetter(startCol + missing.length - 1);
  const writeRange = `'${DEFAULT_SHEET_NAME}'!${startColLetter}1:${endColLetter}1`;

  await sheetsPost(token, `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(writeRange)}:append?valueInputOption=USER_ENTERED`, {
    values: [missing],
  });
}

/**
 * Appends one booking row to the sheet.
 * Reads the current header row first so values align with the correct columns
 * even if the sheet was manually re-ordered (which we ask users not to do,
 * but we handle it gracefully anyway).
 *
 * Returns silently on any error — never blocks a booking from being saved.
 */
export async function appendRow(booking: BookingRecord): Promise<void> {
  try {
    const token = await getValidSheetToken();
    if (!token) return;

    const db = createServerClient();
    const { data: settings } = await db
      .from("host_settings")
      .select("sheet_id")
      .limit(1)
      .maybeSingle();
    if (!settings?.sheet_id) return;

    const sheetId = settings.sheet_id;

    // Ensure headers exist (no-op if already correct)
    await ensureHeaders(token, sheetId);

    // Read current headers to build value array in the right order
    const range = `'${DEFAULT_SHEET_NAME}'!A1:ZZ1`;
    const data = await sheetsGet(token, `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(range)}`);
    const headers: string[] = (data.values?.[0] as string[] | undefined) ?? [];

    const headerIndex = new Map(headers.map((h, i) => [h, i]));
    const row = new Array(headers.length).fill("");

    for (const col of COLUMN_DEFS) {
      const idx = headerIndex.get(col.header);
      if (idx !== undefined) {
        row[idx] = col.value(booking);
      }
    }

    const appendRange = `'${DEFAULT_SHEET_NAME}'!A:A`;
    await sheetsPost(
      token,
      `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { values: [row] }
    );
  } catch (err) {
    // Soft-fail: log but never throw — bookings must never be blocked by Sheets errors
    console.error("[google-sheets] appendRow error:", err);
  }
}

// ── Column letter helper ───────────────────────────────────────────────────────

function colLetter(n: number): string {
  let result = "";
  n = n + 1; // convert 0-based to 1-based
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

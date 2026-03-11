/**
 * calendar-accounts.ts
 *
 * Multi-account calendar connections. One row per connected account
 * (a user can connect multiple Google accounts, multiple Outlook accounts).
 *
 * The "write" account (is_write_calendar = true) is where new booking events
 * are created. All accounts are checked for free/busy conflicts.
 *
 * host_settings is kept in sync with the write account for backward compat
 * with existing availability + event-creation code.
 */

import { createServerClient } from "./supabase";

export type CalendarAccount = {
  id: string;
  provider: "google" | "microsoft";
  email: string | null;
  access_token: string | null;
  refresh_token: string;
  token_expiry: string | null;
  calendar_ids: string[];
  is_write_calendar: boolean;
  created_at: string;
};

export type CalendarAccountState = {
  id: string;
  provider: "google" | "microsoft";
  email: string | null;
  calendars: Array<{ id: string; name: string; isPrimary: boolean }>;
  selectedCalendarIds: string[];
  isWrite: boolean;
};

export async function getCalendarAccounts(
  db = createServerClient()
): Promise<CalendarAccount[]> {
  const { data } = await db
    .from("calendar_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as CalendarAccount[];
}

export async function getWriteCalendarAccount(
  db = createServerClient()
): Promise<CalendarAccount | null> {
  const { data: write } = await db
    .from("calendar_accounts")
    .select("*")
    .eq("is_write_calendar", true)
    .limit(1)
    .maybeSingle();
  if (write) return write as CalendarAccount;

  // Fallback: oldest account
  const { data: first } = await db
    .from("calendar_accounts")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (first as CalendarAccount) ?? null;
}

/**
 * Insert or update a calendar account.
 * If the same email+provider already exists, refresh its tokens.
 * Only sets is_write_calendar=true if no write account exists yet.
 */
export async function upsertCalendarAccount(
  account: {
    provider: "google" | "microsoft";
    email: string | null;
    access_token: string | null;
    refresh_token: string;
    token_expiry: string | null;
    calendar_ids: string[];
  },
  db = createServerClient()
): Promise<string> {
  // Check for existing account with same provider+email
  if (account.email) {
    const { data: existing } = await db
      .from("calendar_accounts")
      .select("id, is_write_calendar")
      .eq("provider", account.provider)
      .eq("email", account.email)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await db
        .from("calendar_accounts")
        .update({
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          token_expiry: account.token_expiry,
        })
        .eq("id", existing.id);
      return existing.id;
    }
  }

  // Check if any write account exists — only first ever account gets write
  const { data: writeAccount } = await db
    .from("calendar_accounts")
    .select("id")
    .eq("is_write_calendar", true)
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("calendar_accounts")
    .insert({ ...account, is_write_calendar: !writeAccount })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Delete an account. If it was the write account, promote the next oldest.
 * Returns the new write account (or null if none left).
 */
export async function deleteCalendarAccount(
  id: string,
  db = createServerClient()
): Promise<CalendarAccount | null> {
  const { data: account } = await db
    .from("calendar_accounts")
    .select("*")
    .eq("id", id)
    .single();

  await db.from("calendar_accounts").delete().eq("id", id);

  if (!account?.is_write_calendar) return null;

  // Promote the next oldest account
  const { data: next } = await db
    .from("calendar_accounts")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (next) {
    await db
      .from("calendar_accounts")
      .update({ is_write_calendar: true })
      .eq("id", next.id);
    return { ...(next as CalendarAccount), is_write_calendar: true };
  }
  return null;
}

export async function setWriteCalendarAccount(
  id: string,
  db = createServerClient()
): Promise<CalendarAccount> {
  await db
    .from("calendar_accounts")
    .update({ is_write_calendar: false })
    .neq("id", id);
  await db
    .from("calendar_accounts")
    .update({ is_write_calendar: true })
    .eq("id", id);
  const { data } = await db
    .from("calendar_accounts")
    .select("*")
    .eq("id", id)
    .single();
  return data as CalendarAccount;
}

export async function updateCalendarAccountIds(
  id: string,
  calendar_ids: string[],
  db = createServerClient()
) {
  const { error } = await db
    .from("calendar_accounts")
    .update({ calendar_ids })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Sync the write account's tokens into host_settings so existing
 * availability-checking and event-creation code keeps working.
 */
export async function syncWriteAccountToHostSettings(
  account: CalendarAccount | null,
  db = createServerClient()
) {
  const { data: existing } = await db
    .from("host_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!existing) return;

  if (!account) {
    await db
      .from("host_settings")
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
        microsoft_access_token: null,
        microsoft_refresh_token: null,
        microsoft_token_expiry: null,
      })
      .eq("id", existing.id);
    return;
  }

  if (account.provider === "google") {
    await db
      .from("host_settings")
      .update({
        google_access_token: account.access_token,
        google_refresh_token: account.refresh_token,
        google_token_expiry: account.token_expiry,
        google_calendar_ids: account.calendar_ids,
        calendar_provider: "google",
      })
      .eq("id", existing.id);
  } else {
    await db
      .from("host_settings")
      .update({
        microsoft_access_token: account.access_token,
        microsoft_refresh_token: account.refresh_token,
        microsoft_token_expiry: account.token_expiry,
        microsoft_calendar_ids: account.calendar_ids,
        calendar_provider: "microsoft",
      })
      .eq("id", existing.id);
  }
}

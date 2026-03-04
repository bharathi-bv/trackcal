/**
 * DELETE /api/member/calendar
 *
 * Team member self-service calendar disconnect.
 * Finds the team_members row by the logged-in user's auth session and
 * clears all three Google Calendar token columns.
 *
 * Used from /member/settings "Disconnect calendar" button.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthServerClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase";

const updateSchema = z.object({
  google_calendar_ids: z.array(z.string().trim().min(1)).optional(),
  microsoft_calendar_ids: z.array(z.string().trim().min(1)).optional(),
});

async function getCurrentUserId() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = createServerClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.google_calendar_ids !== undefined) {
    payload.google_calendar_ids = parsed.data.google_calendar_ids;
  }
  if (parsed.data.microsoft_calendar_ids !== undefined) {
    payload.microsoft_calendar_ids = parsed.data.microsoft_calendar_ids;
  }

  const { error } = await db.from("team_members").update(payload).eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServerClient();
  const { error } = await db
    .from("team_members")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      google_calendar_ids: [],
      microsoft_access_token: null,
      microsoft_refresh_token: null,
      microsoft_token_expiry: null,
      microsoft_calendar_ids: [],
    })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

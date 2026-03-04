/**
 * /api/team-members/[id]
 *
 * PATCH  — Update name, email, photo_url, or is_active.
 * DELETE — Remove team member. Existing bookings retain the record via FK
 *          ON DELETE SET NULL (assigned_to becomes null).
 *
 * Auth: dashboard users only (requireApiUser).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { z } from "zod";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(255).optional(),
    photo_url: z.string().url().nullable().optional(),
    is_active: z.boolean().optional(),
    // When true, clears all Google Calendar tokens for the member
    disconnect_calendar: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields provided to update");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const db = createServerClient();

  // Build update payload — disconnect_calendar is a virtual flag, not a column
  const { disconnect_calendar, ...fieldUpdates } = parsed.data;
  const updatePayload: Record<string, unknown> = { ...fieldUpdates };
  if (disconnect_calendar === true) {
    updatePayload.google_access_token = null;
    updatePayload.google_refresh_token = null;
    updatePayload.google_token_expiry = null;
    updatePayload.google_calendar_ids = [];
    updatePayload.microsoft_access_token = null;
    updatePayload.microsoft_refresh_token = null;
    updatePayload.microsoft_token_expiry = null;
    updatePayload.microsoft_calendar_ids = [];
  }

  const { data, error } = await db
    .from("team_members")
    .update(updatePayload)
    .eq("id", id)
    .select("id, name, email, photo_url, is_active, google_refresh_token, microsoft_refresh_token, last_booking_at, created_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const db = createServerClient();

  const { error } = await db.from("team_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

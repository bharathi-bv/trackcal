/**
 * /api/team-members
 *
 * GET  — List all team members (excludes Google token columns).
 * POST — Add a new team member (name + email). Calendar connected later via OAuth.
 *
 * Auth: dashboard users only (requireApiUser).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { sendTeamMemberInviteEmail } from "@/lib/email";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Valid email required").max(255),
  photo_url: z.string().url().optional().nullable(),
});

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const db = createServerClient();
  const { data, error } = await db
    .from("team_members")
    .select("id, name, email, photo_url, is_active, google_refresh_token, microsoft_refresh_token, last_booking_at, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const db = createServerClient();
  const { data, error } = await db
    .from("team_members")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      photo_url: parsed.data.photo_url ?? null,
    })
    .select("id, name, email, photo_url, is_active, google_refresh_token, microsoft_refresh_token, last_booking_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send a CitaCal invite email that routes members into the OAuth-only auth flow.
  // Non-blocking: a failed email does not block member creation.
  const appUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "";
  try {
    await sendTeamMemberInviteEmail({
      toEmail: parsed.data.email,
      memberName: parsed.data.name,
      signupUrl: `${appUrl}/signup`,
      loginUrl: `${appUrl}/login`,
    });
  } catch (inviteErr) {
    console.error("[team-members] invite email failed (non-blocking):", inviteErr);
  }

  return NextResponse.json({ member: data }, { status: 201 });
}

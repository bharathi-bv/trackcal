/**
 * GET /api/settings  — returns host_name + profile_photo_url + weekly_availability
 * PUT /api/settings  — upserts host_name + profile_photo_url + weekly_availability
 *
 * Uses the service_role client so it bypasses RLS (same as all other API routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { z } from "zod";

const settingsSchema = z.object({
  host_name: z.string().trim().max(120).optional().nullable(),
  // Allow full URLs, data: URIs (file-upload base64), or empty string
  profile_photo_url: z.string().trim().max(500000).optional().or(z.literal("")).nullable(),
  weekly_availability: z.record(z.any()).optional().nullable(),
});

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("host_name, profile_photo_url, weekly_availability")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    settings: data ?? { host_name: null, profile_photo_url: null, weekly_availability: null },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const { unauthorized } = await requireApiUser();
    if (unauthorized) return unauthorized;

    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const host_name = parsed.data.host_name || null;
    const profile_photo_url = parsed.data.profile_photo_url || null;
    const weekly_availability = parsed.data.weekly_availability ?? undefined;

    const db = createServerClient();

    // Check if a row already exists
    const { data: existing } = await db
      .from("host_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      host_name: host_name || null,
      profile_photo_url: profile_photo_url || null,
    };
    // Only include weekly_availability in the update if it was explicitly sent
    if (weekly_availability !== undefined) {
      payload.weekly_availability = weekly_availability;
    }

    let error;
    if (existing) {
      ({ error } = await db
        .from("host_settings")
        .update(payload)
        .eq("id", existing.id));
    } else {
      ({ error } = await db.from("host_settings").insert(payload));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings] PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/settings  — returns host_name + profile_photo_url
 * PUT /api/settings  — upserts host_name + profile_photo_url
 *
 * Uses the service_role client so it bypasses RLS (same as all other API routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("host_name, profile_photo_url")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    settings: data ?? { host_name: null, profile_photo_url: null },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const { host_name, profile_photo_url } = await request.json();

    const db = createServerClient();

    // Check if a row already exists
    const { data: existing } = await db
      .from("host_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await db
        .from("host_settings")
        .update({
          host_name: host_name || null,
          profile_photo_url: profile_photo_url || null,
        })
        .eq("id", existing.id));
    } else {
      ({ error } = await db.from("host_settings").insert({
        host_name: host_name || null,
        profile_photo_url: profile_photo_url || null,
      }));
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

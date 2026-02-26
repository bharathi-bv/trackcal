import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { z } from "zod";
import { DEFAULT_WEEKLY_AVAILABILITY, normalizeWeeklyAvailability } from "@/lib/event-type-config";

const daySchema = z.object({
  enabled: z.boolean(),
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
});

const eventTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .max(120)
    .optional(),
  duration: z.number().int().min(5).max(480),
  description: z.string().max(2000).optional().nullable(),
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
  slot_increment: z.number().int().refine((v) => [15, 30, 60].includes(v), {
    message: "slot_increment must be 15, 30, or 60",
  }),
  title_template: z.string().trim().max(200).optional().nullable(),
  location_type: z
    .enum(["google_meet", "zoom", "phone", "custom", "none"])
    .optional()
    .default("google_meet"),
  location_value: z.string().trim().max(500).optional().nullable(),
  min_notice_hours: z.number().int().min(0).max(720).optional().default(0),
  max_days_in_advance: z.number().int().min(1).max(365).optional().default(60),
  booking_window_type: z.enum(["rolling", "fixed"]).optional().default("rolling"),
  booking_window_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  booking_window_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  buffer_before_minutes: z.number().int().min(0).max(240).optional().default(0),
  buffer_after_minutes: z.number().int().min(0).max(240).optional().default(0),
  max_bookings_per_day: z.number().int().min(1).max(1000).optional().nullable(),
  max_bookings_per_slot: z.number().int().min(1).max(1000).optional().nullable(),
  weekly_availability: z.record(daySchema).optional().nullable(),
  blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const db = createServerClient();
  const { data, error } = await db
    .from("event_types")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const parsed = eventTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }
  if (parsed.data.start_hour >= parsed.data.end_hour) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }
  const weekly = normalizeWeeklyAvailability(
    parsed.data.weekly_availability ?? DEFAULT_WEEKLY_AVAILABILITY
  );
  if (
    parsed.data.booking_window_type === "fixed" &&
    (!parsed.data.booking_window_start_date || !parsed.data.booking_window_end_date)
  ) {
    return NextResponse.json(
      { error: "Fixed window requires start and end date." },
      { status: 400 }
    );
  }
  if (
    parsed.data.booking_window_type === "fixed" &&
    parsed.data.booking_window_start_date &&
    parsed.data.booking_window_end_date &&
    parsed.data.booking_window_start_date > parsed.data.booking_window_end_date
  ) {
    return NextResponse.json(
      { error: "Booking window start must be before or equal to end date." },
      { status: 400 }
    );
  }
  for (const key of Object.keys(weekly)) {
    const day = weekly[key];
    if (day.enabled && day.start_hour >= day.end_hour) {
      return NextResponse.json(
        { error: `Invalid weekly availability for day ${key}: end must be after start.` },
        { status: 400 }
      );
    }
  }

  const db = createServerClient();

  // Auto-generate slug from name if not supplied
  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);

  const { data: existingBySlug } = await db
    .from("event_types")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingBySlug) {
    return NextResponse.json({ error: "Slug already exists. Use a different one." }, { status: 409 });
  }

  const { data, error } = await db
    .from("event_types")
    .insert({
      ...parsed.data,
      slug,
      description: parsed.data.description || null,
      title_template: parsed.data.title_template || null,
      location_type: parsed.data.location_type || "google_meet",
      location_value: parsed.data.location_value || null,
      booking_window_type: parsed.data.booking_window_type || "rolling",
      booking_window_start_date:
        parsed.data.booking_window_type === "fixed"
          ? parsed.data.booking_window_start_date || null
          : null,
      booking_window_end_date:
        parsed.data.booking_window_type === "fixed"
          ? parsed.data.booking_window_end_date || null
          : null,
      max_bookings_per_day: parsed.data.max_bookings_per_day || null,
      max_bookings_per_slot: parsed.data.max_bookings_per_slot || null,
      weekly_availability: weekly,
      blocked_dates: parsed.data.blocked_dates ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

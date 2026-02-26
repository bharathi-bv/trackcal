import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { z } from "zod";
import { normalizeWeeklyAvailability } from "@/lib/event-type-config";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
      .max(120)
      .optional(),
    duration: z.number().int().min(5).max(480).optional(),
    description: z.string().max(2000).nullable().optional(),
    title_template: z.string().trim().max(200).nullable().optional(),
    start_hour: z.number().int().min(0).max(23).optional(),
    end_hour: z.number().int().min(1).max(24).optional(),
    slot_increment: z
      .number()
      .int()
      .refine((v) => [15, 30, 60].includes(v), {
        message: "slot_increment must be 15, 30, or 60",
      })
      .optional(),
    location_type: z
      .enum(["google_meet", "zoom", "phone", "custom", "none"])
      .optional(),
    location_value: z.string().trim().max(500).nullable().optional(),
    min_notice_hours: z.number().int().min(0).max(720).optional(),
    max_days_in_advance: z.number().int().min(1).max(365).optional(),
    booking_window_type: z.enum(["rolling", "fixed"]).optional(),
    booking_window_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    booking_window_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    buffer_before_minutes: z.number().int().min(0).max(240).optional(),
    buffer_after_minutes: z.number().int().min(0).max(240).optional(),
    max_bookings_per_day: z.number().int().min(1).max(1000).nullable().optional(),
    max_bookings_per_slot: z.number().int().min(1).max(1000).nullable().optional(),
    weekly_availability: z
      .record(
        z.object({
          enabled: z.boolean(),
          start_hour: z.number().int().min(0).max(23),
          end_hour: z.number().int().min(1).max(24),
        })
      )
      .nullable()
      .optional(),
    blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    is_active: z.boolean().optional(),
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

  const { data: current } = await db
    .from("event_types")
    .select(
      "start_hour, end_hour, weekly_availability, booking_window_type, booking_window_start_date, booking_window_end_date"
    )
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "Event type not found" }, { status: 404 });
  }

  const nextStart = parsed.data.start_hour ?? current.start_hour;
  const nextEnd = parsed.data.end_hour ?? current.end_hour;
  if (nextStart >= nextEnd) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }
  const nextWeekly =
    parsed.data.weekly_availability !== undefined
      ? normalizeWeeklyAvailability(parsed.data.weekly_availability)
      : normalizeWeeklyAvailability(current.weekly_availability);
  for (const key of Object.keys(nextWeekly)) {
    const day = nextWeekly[key];
    if (day.enabled && day.start_hour >= day.end_hour) {
      return NextResponse.json(
        { error: `Invalid weekly availability for day ${key}: end must be after start.` },
        { status: 400 }
      );
    }
  }
  const nextWindowType = parsed.data.booking_window_type ?? current.booking_window_type ?? "rolling";
  const nextWindowStart =
    parsed.data.booking_window_start_date !== undefined
      ? parsed.data.booking_window_start_date
      : current.booking_window_start_date;
  const nextWindowEnd =
    parsed.data.booking_window_end_date !== undefined
      ? parsed.data.booking_window_end_date
      : current.booking_window_end_date;
  if (nextWindowType === "fixed" && (!nextWindowStart || !nextWindowEnd)) {
    return NextResponse.json(
      { error: "Fixed window requires start and end date." },
      { status: 400 }
    );
  }
  if (nextWindowType === "fixed" && nextWindowStart && nextWindowEnd && nextWindowStart > nextWindowEnd) {
    return NextResponse.json(
      { error: "Booking window start must be before or equal to end date." },
      { status: 400 }
    );
  }

  if (parsed.data.slug) {
    const { data: existingBySlug } = await db
      .from("event_types")
      .select("id")
      .eq("slug", parsed.data.slug)
      .neq("id", id)
      .maybeSingle();
    if (existingBySlug) {
      return NextResponse.json({ error: "Slug already exists. Use a different one." }, { status: 409 });
    }
  }

  const { data, error } = await db
    .from("event_types")
    .update({
      ...parsed.data,
      description:
        parsed.data.description !== undefined ? parsed.data.description || null : undefined,
      title_template:
        parsed.data.title_template !== undefined ? parsed.data.title_template || null : undefined,
      location_value:
        parsed.data.location_value !== undefined ? parsed.data.location_value || null : undefined,
      booking_window_type: parsed.data.booking_window_type ?? undefined,
      booking_window_start_date:
        nextWindowType === "fixed"
          ? parsed.data.booking_window_start_date !== undefined
            ? parsed.data.booking_window_start_date || null
            : undefined
          : null,
      booking_window_end_date:
        nextWindowType === "fixed"
          ? parsed.data.booking_window_end_date !== undefined
            ? parsed.data.booking_window_end_date || null
            : undefined
          : null,
      max_bookings_per_day:
        parsed.data.max_bookings_per_day !== undefined
          ? parsed.data.max_bookings_per_day || null
          : undefined,
      max_bookings_per_slot:
        parsed.data.max_bookings_per_slot !== undefined
          ? parsed.data.max_bookings_per_slot || null
          : undefined,
      weekly_availability: nextWeekly,
      blocked_dates:
        parsed.data.blocked_dates !== undefined ? parsed.data.blocked_dates ?? [] : undefined,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const db = createServerClient();

  const { error } = await db.from("event_types").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

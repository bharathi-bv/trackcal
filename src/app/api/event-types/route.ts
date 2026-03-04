import { NextRequest, NextResponse } from "next/server";
import { getFallbackAvailabilityScheduleId } from "@/lib/availability-schedules";
import { createServerClient } from "@/lib/supabase";
import { requireApiUser } from "@/lib/api-auth";
import { z } from "zod";
import {
  getWeeklyAvailabilityValidationError,
  normalizeAvailabilityBlockers,
  normalizeWeeklyAvailability,
} from "@/lib/event-type-config";
import type { TeamSchedulingMode } from "@/lib/team-scheduling";

const utmLinkSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(240).optional().nullable(),
  utm_source: z.string().trim().max(120).optional().nullable(),
  utm_medium: z.string().trim().max(120).optional().nullable(),
  utm_campaign: z.string().trim().max(200).optional().nullable(),
  utm_term: z.string().trim().max(200).optional().nullable(),
  utm_content: z.string().trim().max(200).optional().nullable(),
});

const rangeSchema = z.object({
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
});

const daySchema = z.object({
  enabled: z.boolean(),
  start_hour: z.number().int().min(0).max(23).optional(),
  end_hour: z.number().int().min(1).max(24).optional(),
  ranges: z.array(rangeSchema).optional(),
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
  availability_schedule_id: z.string().uuid().optional().nullable(),
  weekly_availability: z.record(z.string(), daySchema).optional().nullable(),
  blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  blocked_weekdays: z.array(z.number().int().min(0).max(6)).optional().nullable(),
  is_active: z.boolean().optional().default(true),
  assigned_member_ids: z.array(z.string().uuid()).optional().default([]),
  team_scheduling_mode: z.enum(["round_robin", "collective"]).optional().default("round_robin"),
  collective_required_member_ids: z.array(z.string().uuid()).optional().default([]),
  collective_show_availability_tiers: z.boolean().optional().default(false),
  collective_min_available_hosts: z.number().int().min(1).max(1000).optional().nullable(),
  utm_links: z.array(utmLinkSchema).optional().default([]),
  custom_questions: z.array(z.any()).optional().default([]),
});

function normalizeUtmLinks(value: z.infer<typeof utmLinkSchema>[]) {
  return value.map((link) => ({
    id: link.id?.trim() || crypto.randomUUID(),
    description: link.description?.trim() || "",
    utm_source: link.utm_source?.trim() || "",
    utm_medium: link.utm_medium?.trim() || "",
    utm_campaign: link.utm_campaign?.trim() || "",
    utm_term: link.utm_term?.trim() || "",
    utm_content: link.utm_content?.trim() || "",
  }));
}

function validateTeamScheduling(data: {
  assigned_member_ids: string[];
  team_scheduling_mode: TeamSchedulingMode;
  collective_required_member_ids: string[];
  collective_show_availability_tiers: boolean;
  collective_min_available_hosts?: number | null;
}) {
  const assignedSet = new Set(data.assigned_member_ids);
  const invalidRequired = data.collective_required_member_ids.find((id) => !assignedSet.has(id));
  if (invalidRequired) {
    return "Required hosts must also be selected in the team list.";
  }

  if (data.team_scheduling_mode !== "collective") return null;
  if (data.assigned_member_ids.length === 0) {
    return "Collective meetings require at least one assigned team member.";
  }

  if (
    data.collective_min_available_hosts &&
    data.collective_min_available_hosts > data.assigned_member_ids.length
  ) {
    return "Minimum available hosts cannot exceed the selected team members.";
  }

  if (
    data.collective_show_availability_tiers &&
    data.collective_min_available_hosts &&
    data.collective_min_available_hosts < 1
  ) {
    return "Minimum available hosts must be at least 1.";
  }

  return null;
}

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
  const weekly =
    parsed.data.weekly_availability === null
      ? null
      : parsed.data.weekly_availability
        ? normalizeWeeklyAvailability(parsed.data.weekly_availability)
        : null;
  const blockers = normalizeAvailabilityBlockers({
    dates: parsed.data.blocked_dates ?? [],
    weekdays: parsed.data.blocked_weekdays ?? [],
  });
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
  if (weekly) {
    const validation = getWeeklyAvailabilityValidationError(weekly);
    if (validation) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }
  }

  const teamSchedulingError = validateTeamScheduling(parsed.data);
  if (teamSchedulingError) {
    return NextResponse.json({ error: teamSchedulingError }, { status: 400 });
  }

  const db = createServerClient();
  const availabilityScheduleId =
    weekly === null
      ? parsed.data.availability_schedule_id ?? (await getFallbackAvailabilityScheduleId(db))
      : null;

  if (!weekly && !availabilityScheduleId) {
    return NextResponse.json(
      { error: "Select an availability schedule or add a custom schedule." },
      { status: 400 }
    );
  }

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
      availability_schedule_id: availabilityScheduleId,
      weekly_availability: weekly,
      blocked_dates: blockers.dates,
      blocked_weekdays: blockers.weekdays,
      team_scheduling_mode: parsed.data.team_scheduling_mode,
      collective_required_member_ids: parsed.data.collective_required_member_ids,
      collective_show_availability_tiers: parsed.data.collective_show_availability_tiers,
      collective_min_available_hosts: parsed.data.collective_min_available_hosts || null,
      utm_links: normalizeUtmLinks(parsed.data.utm_links ?? []),
      custom_questions: parsed.data.custom_questions ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

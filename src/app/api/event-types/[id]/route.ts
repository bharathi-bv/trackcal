import { NextRequest, NextResponse } from "next/server";
import {
  getFallbackAvailabilityScheduleId,
  resolveAvailabilityRules,
} from "@/lib/availability-schedules";
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
    availability_schedule_id: z.string().uuid().nullable().optional(),
    weekly_availability: z.record(z.string(), daySchema).nullable().optional(),
    blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    blocked_weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    is_active: z.boolean().optional(),
    assigned_member_ids: z.array(z.string().uuid()).optional(),
    team_scheduling_mode: z.enum(["round_robin", "collective"]).optional(),
    collective_required_member_ids: z.array(z.string().uuid()).optional(),
    collective_show_availability_tiers: z.boolean().optional(),
    collective_min_available_hosts: z.number().int().min(1).max(1000).nullable().optional(),
    utm_links: z.array(utmLinkSchema).optional(),
    custom_css: z.string().max(20000).nullable().optional(),
    custom_questions: z.array(z.any()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields provided to update");

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
  collective_min_available_hosts: number | null | undefined;
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

  return null;
}

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
      "start_hour, end_hour, availability_schedule_id, weekly_availability, booking_window_type, booking_window_start_date, booking_window_end_date, assigned_member_ids, team_scheduling_mode, collective_required_member_ids, collective_show_availability_tiers, collective_min_available_hosts"
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
      ? parsed.data.weekly_availability === null
        ? null
        : normalizeWeeklyAvailability(parsed.data.weekly_availability)
      : current.weekly_availability
        ? normalizeWeeklyAvailability(current.weekly_availability)
        : null;
  const nextBlockers = normalizeAvailabilityBlockers({
    dates: parsed.data.blocked_dates !== undefined ? parsed.data.blocked_dates ?? [] : [],
    weekdays: parsed.data.blocked_weekdays !== undefined ? parsed.data.blocked_weekdays ?? [] : [],
  });
  if (nextWeekly) {
    const validation = getWeeklyAvailabilityValidationError(nextWeekly);
    if (validation) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
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

  const nextAssignedMemberIds = parsed.data.assigned_member_ids ?? current.assigned_member_ids ?? [];
  const nextTeamSchedulingMode =
    parsed.data.team_scheduling_mode ?? current.team_scheduling_mode ?? "round_robin";
  const nextCollectiveRequiredMemberIds =
    parsed.data.collective_required_member_ids ??
    current.collective_required_member_ids ??
    [];
  const nextCollectiveShowAvailabilityTiers =
    parsed.data.collective_show_availability_tiers ??
    current.collective_show_availability_tiers ??
    false;
  const nextCollectiveMinAvailableHosts =
    parsed.data.collective_min_available_hosts !== undefined
      ? parsed.data.collective_min_available_hosts
      : current.collective_min_available_hosts;
  const nextAvailabilityScheduleId =
    nextWeekly === null
      ? parsed.data.availability_schedule_id !== undefined
        ? parsed.data.availability_schedule_id
        : current.availability_schedule_id ?? (await getFallbackAvailabilityScheduleId(db))
      : null;

  const shouldSyncResolvedAvailability =
    parsed.data.weekly_availability !== undefined ||
    parsed.data.availability_schedule_id !== undefined ||
    parsed.data.blocked_dates !== undefined ||
    parsed.data.blocked_weekdays !== undefined ||
    nextWeekly === null;

  const resolvedAvailability = shouldSyncResolvedAvailability
    ? await resolveAvailabilityRules({
        weeklyAvailability: nextWeekly,
        availabilityScheduleId: nextAvailabilityScheduleId,
        blockedDates: nextBlockers.dates,
        blockedWeekdays: nextBlockers.weekdays,
        db,
      })
    : null;
  const persistedWeekly = resolvedAvailability?.weekly_availability ?? nextWeekly;

  const teamSchedulingError = validateTeamScheduling({
    assigned_member_ids: nextAssignedMemberIds,
    team_scheduling_mode: nextTeamSchedulingMode,
    collective_required_member_ids: nextCollectiveRequiredMemberIds,
    collective_show_availability_tiers: nextCollectiveShowAvailabilityTiers,
    collective_min_available_hosts: nextCollectiveMinAvailableHosts,
  });
  if (teamSchedulingError) {
    return NextResponse.json({ error: teamSchedulingError }, { status: 400 });
  }
  if (!nextWeekly && !nextAvailabilityScheduleId) {
    return NextResponse.json(
      { error: "Select an availability schedule or add a custom schedule." },
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
      availability_schedule_id:
        parsed.data.availability_schedule_id !== undefined || nextWeekly === null
          ? nextAvailabilityScheduleId
          : undefined,
      weekly_availability:
        shouldSyncResolvedAvailability ? persistedWeekly : undefined,
      blocked_dates:
        parsed.data.blocked_dates !== undefined ? nextBlockers.dates : undefined,
      blocked_weekdays:
        parsed.data.blocked_weekdays !== undefined ? nextBlockers.weekdays : undefined,
      team_scheduling_mode: parsed.data.team_scheduling_mode ?? undefined,
      collective_required_member_ids:
        parsed.data.collective_required_member_ids ?? undefined,
      collective_show_availability_tiers:
        parsed.data.collective_show_availability_tiers ?? undefined,
      collective_min_available_hosts:
        parsed.data.collective_min_available_hosts !== undefined
          ? parsed.data.collective_min_available_hosts || null
          : undefined,
      utm_links:
        parsed.data.utm_links !== undefined
          ? normalizeUtmLinks(parsed.data.utm_links)
          : undefined,
      custom_css:
        parsed.data.custom_css !== undefined
          ? parsed.data.custom_css?.trim() || null
          : undefined,
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

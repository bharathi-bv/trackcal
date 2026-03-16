import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import {
  getAvailabilitySchedules,
  normalizeAvailabilitySchedule,
} from "@/lib/availability-schedules";
import {
  getWeeklyAvailabilityValidationError,
  normalizeAvailabilityBlockers,
  normalizeWeeklyAvailability,
} from "@/lib/event-type-config";
import { createServerClient } from "@/lib/supabase";

const rangeSchema = z.object({
  start_hour: z.number().min(0).max(23.75),
  end_hour: z.number().min(0.25).max(24),
});

const daySchema = z.object({
  enabled: z.boolean(),
  start_hour: z.number().min(0).max(23.75).optional(),
  end_hour: z.number().min(0.25).max(24).optional(),
  ranges: z.array(rangeSchema).optional(),
});

const dateOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ranges: z.array(rangeSchema).min(1),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  weekly_availability: z.record(z.string(), daySchema),
  blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().default([]),
  blocked_weekdays: z.array(z.number().int().min(0).max(6)).optional().default([]),
  date_overrides: z.array(dateOverrideSchema).optional().default([]),
  is_default: z.boolean().optional().default(false),
});

export async function GET() {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const db = createServerClient();
  const [schedules, usageResult] = await Promise.all([
    getAvailabilitySchedules(db),
    db.from("event_types").select("availability_schedule_id"),
  ]);

  const usageCounts = new Map<string, number>();
  (usageResult.data ?? []).forEach((row) => {
    if (!row.availability_schedule_id) return;
    usageCounts.set(
      row.availability_schedule_id,
      (usageCounts.get(row.availability_schedule_id) ?? 0) + 1
    );
  });

  return NextResponse.json({
    schedules: schedules.map((schedule) => ({
      ...schedule,
      usage_count: usageCounts.get(schedule.id) ?? 0,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const weekly = normalizeWeeklyAvailability(parsed.data.weekly_availability);
  const validation = getWeeklyAvailabilityValidationError(weekly);
  if (validation) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }
  const blockers = normalizeAvailabilityBlockers({
    dates: parsed.data.blocked_dates,
    weekdays: parsed.data.blocked_weekdays,
  });

  const db = createServerClient();
  if (parsed.data.is_default) {
    await db.from("availability_schedules").update({ is_default: false }).eq("is_default", true);
  }

  const { data, error } = await db
    .from("availability_schedules")
    .insert({
      name: parsed.data.name,
      weekly_availability: weekly,
      blocked_dates: blockers.dates,
      blocked_weekdays: blockers.weekdays,
      date_overrides: parsed.data.date_overrides,
      is_default: parsed.data.is_default,
    })
    .select("id, name, weekly_availability, blocked_dates, blocked_weekdays, date_overrides, is_default, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: normalizeAvailabilitySchedule(data) }, { status: 201 });
}

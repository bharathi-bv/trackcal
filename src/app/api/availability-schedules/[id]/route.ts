import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { normalizeAvailabilitySchedule } from "@/lib/availability-schedules";
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

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    weekly_availability: z.record(z.string(), daySchema).optional(),
    blocked_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    blocked_weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    date_overrides: z.array(dateOverrideSchema).optional(),
    is_default: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No fields provided to update");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  const db = createServerClient();
  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.weekly_availability !== undefined) {
    const weekly = normalizeWeeklyAvailability(parsed.data.weekly_availability);
    const validation = getWeeklyAvailabilityValidationError(weekly);
    if (validation) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }
    payload.weekly_availability = weekly;
  }
  if (parsed.data.blocked_dates !== undefined || parsed.data.blocked_weekdays !== undefined) {
    const blockers = normalizeAvailabilityBlockers({
      dates: parsed.data.blocked_dates,
      weekdays: parsed.data.blocked_weekdays,
    });
    if (parsed.data.blocked_dates !== undefined) payload.blocked_dates = blockers.dates;
    if (parsed.data.blocked_weekdays !== undefined) payload.blocked_weekdays = blockers.weekdays;
  }
  if (parsed.data.date_overrides !== undefined) payload.date_overrides = parsed.data.date_overrides;
  if (parsed.data.is_default !== undefined) {
    if (parsed.data.is_default) {
      await db.from("availability_schedules").update({ is_default: false }).eq("is_default", true);
    }
    payload.is_default = parsed.data.is_default;
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("availability_schedules")
    .update(payload)
    .eq("id", id)
    .select("id, name, weekly_availability, blocked_dates, blocked_weekdays, date_overrides, is_default, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: normalizeAvailabilitySchedule(data) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const db = createServerClient();
  const [{ data: schedule }, { count }] = await Promise.all([
    db.from("availability_schedules").select("id, is_default").eq("id", id).maybeSingle(),
    db
      .from("event_types")
      .select("id", { count: "exact", head: true })
      .eq("availability_schedule_id", id),
  ]);

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  if (schedule.is_default) {
    return NextResponse.json(
      { error: "The default schedule cannot be deleted." },
      { status: 409 }
    );
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "This schedule is still used by meeting links." },
      { status: 409 }
    );
  }

  const { error } = await db.from("availability_schedules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

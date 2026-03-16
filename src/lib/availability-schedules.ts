import {
  DEFAULT_AVAILABILITY_BLOCKERS,
  DEFAULT_WEEKLY_AVAILABILITY,
  normalizeAvailabilityBlockers,
  normalizeWeeklyAvailability,
  type AvailabilityBlockers,
  type WeeklyAvailability,
} from "@/lib/event-type-config";
import { createServerClient } from "@/lib/supabase";

export type DateOverride = {
  date: string; // "YYYY-MM-DD"
  ranges: { start_hour: number; end_hour: number }[];
};

export type AvailabilityScheduleRow = {
  id: string;
  name: string;
  weekly_availability: unknown;
  blocked_dates?: unknown;
  blocked_weekdays?: unknown;
  date_overrides?: unknown;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AvailabilitySchedule = {
  id: string;
  name: string;
  weekly_availability: WeeklyAvailability;
  blockers: AvailabilityBlockers;
  date_overrides: DateOverride[];
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

function normalizeDateOverrides(raw: unknown): DateOverride[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>)
    .filter((item) => typeof item?.date === "string" && Array.isArray(item?.ranges))
    .map((item) => ({
      date: item.date as string,
      ranges: (item.ranges as Array<Record<string, unknown>>)
        .filter((r) => typeof r?.start_hour === "number" && typeof r?.end_hour === "number")
        .map((r) => ({ start_hour: r.start_hour as number, end_hour: r.end_hour as number })),
    }))
    .filter((o) => o.ranges.length > 0);
}

export function normalizeAvailabilitySchedule(row: AvailabilityScheduleRow): AvailabilitySchedule {
  return {
    id: row.id,
    name: row.name,
    weekly_availability: normalizeWeeklyAvailability(row.weekly_availability),
    blockers: normalizeAvailabilityBlockers({
      dates: row.blocked_dates,
      weekdays: row.blocked_weekdays,
    }),
    date_overrides: normalizeDateOverrides(row.date_overrides),
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getAvailabilitySchedules(
  db: ReturnType<typeof createServerClient> = createServerClient()
) {
  const { data, error } = await db
    .from("availability_schedules")
    .select("id, name, weekly_availability, blocked_dates, blocked_weekdays, date_overrides, is_default, created_at, updated_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    normalizeAvailabilitySchedule(row as AvailabilityScheduleRow)
  );
}

export async function getDefaultAvailabilitySchedule(
  db: ReturnType<typeof createServerClient> = createServerClient()
) {
  const { data } = await db
    .from("availability_schedules")
    .select("id, name, weekly_availability, blocked_dates, blocked_weekdays, date_overrides, is_default, created_at, updated_at")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (data) {
    return normalizeAvailabilitySchedule(data as AvailabilityScheduleRow);
  }

  const { data: fallbackHost } = await db
    .from("host_settings")
    .select("weekly_availability")
    .limit(1)
    .maybeSingle();

    return {
      id: "legacy-default",
      name: "Default schedule",
      weekly_availability: normalizeWeeklyAvailability(
        fallbackHost?.weekly_availability ?? DEFAULT_WEEKLY_AVAILABILITY
      ),
      blockers: DEFAULT_AVAILABILITY_BLOCKERS,
      is_default: true,
    };
}

export async function resolveAvailabilityRules({
  weeklyAvailability,
  availabilityScheduleId,
  blockedDates,
  blockedWeekdays,
  db = createServerClient(),
}: {
  weeklyAvailability: unknown;
  availabilityScheduleId?: string | null;
  blockedDates?: unknown;
  blockedWeekdays?: unknown;
  db?: ReturnType<typeof createServerClient>;
}) {
  const localBlockers = normalizeAvailabilityBlockers({
    dates: blockedDates,
    weekdays: blockedWeekdays,
  });
  if (weeklyAvailability) {
    return {
      weekly_availability: normalizeWeeklyAvailability(weeklyAvailability),
      blockers: localBlockers,
    };
  }

  if (availabilityScheduleId) {
    const { data } = await db
      .from("availability_schedules")
      .select("weekly_availability, blocked_dates, blocked_weekdays")
      .eq("id", availabilityScheduleId)
      .limit(1)
      .maybeSingle();
    if (data?.weekly_availability) {
      const scheduleBlockers = normalizeAvailabilityBlockers({
        dates: data.blocked_dates,
        weekdays: data.blocked_weekdays,
      });
      return {
        weekly_availability: normalizeWeeklyAvailability(data.weekly_availability),
        blockers: {
          dates: [...new Set([...scheduleBlockers.dates, ...localBlockers.dates])].sort(),
          weekdays: [...new Set([...scheduleBlockers.weekdays, ...localBlockers.weekdays])].sort(
            (a, b) => a - b
          ),
        },
      };
    }
  }

  const defaultSchedule = await getDefaultAvailabilitySchedule(db);
  return {
    weekly_availability: defaultSchedule.weekly_availability,
    blockers: {
      dates: localBlockers.dates,
      weekdays: localBlockers.weekdays,
    },
  };
}

export async function getFallbackAvailabilityScheduleId(
  db: ReturnType<typeof createServerClient> = createServerClient()
) {
  const schedule = await getDefaultAvailabilitySchedule(db);
  return schedule.id === "legacy-default" ? null : schedule.id;
}

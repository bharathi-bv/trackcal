export type DayAvailability = {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
};

export type WeeklyAvailability = Record<string, DayAvailability>;

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = {
  "0": { enabled: false, start_hour: 9, end_hour: 17 },
  "1": { enabled: true, start_hour: 9, end_hour: 17 },
  "2": { enabled: true, start_hour: 9, end_hour: 17 },
  "3": { enabled: true, start_hour: 9, end_hour: 17 },
  "4": { enabled: true, start_hour: 9, end_hour: 17 },
  "5": { enabled: true, start_hour: 9, end_hour: 17 },
  "6": { enabled: false, start_hour: 9, end_hour: 17 },
};

export function normalizeWeeklyAvailability(input: unknown): WeeklyAvailability {
  const fallback = DEFAULT_WEEKLY_AVAILABILITY;
  if (!input || typeof input !== "object") return fallback;

  const raw = input as Record<string, unknown>;
  const next: WeeklyAvailability = { ...fallback };

  for (let day = 0; day <= 6; day++) {
    const key = String(day);
    const val = raw[key];
    if (!val || typeof val !== "object") continue;
    const obj = val as Record<string, unknown>;
    const enabled = Boolean(obj.enabled);
    const start_hour = Number(obj.start_hour);
    const end_hour = Number(obj.end_hour);
    next[key] = {
      enabled,
      start_hour: Number.isFinite(start_hour) ? Math.max(0, Math.min(23, start_hour)) : 9,
      end_hour: Number.isFinite(end_hour) ? Math.max(1, Math.min(24, end_hour)) : 17,
    };
    if (next[key].start_hour >= next[key].end_hour) {
      next[key].start_hour = 9;
      next[key].end_hour = 17;
    }
  }

  return next;
}

export type AvailabilityRange = {
  start_hour: number;
  end_hour: number;
};

export type DayAvailability = {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  ranges: AvailabilityRange[];
};

export type WeeklyAvailability = Record<string, DayAvailability>;

export type AvailabilityBlockers = {
  dates: string[];
  weekdays: number[];
};

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = {
  "0": { enabled: false, start_hour: 9, end_hour: 17, ranges: [] },
  "1": { enabled: true, start_hour: 9, end_hour: 17, ranges: [{ start_hour: 9, end_hour: 17 }] },
  "2": { enabled: true, start_hour: 9, end_hour: 17, ranges: [{ start_hour: 9, end_hour: 17 }] },
  "3": { enabled: true, start_hour: 9, end_hour: 17, ranges: [{ start_hour: 9, end_hour: 17 }] },
  "4": { enabled: true, start_hour: 9, end_hour: 17, ranges: [{ start_hour: 9, end_hour: 17 }] },
  "5": { enabled: true, start_hour: 9, end_hour: 17, ranges: [{ start_hour: 9, end_hour: 17 }] },
  "6": { enabled: false, start_hour: 9, end_hour: 17, ranges: [] },
};

export const DEFAULT_AVAILABILITY_BLOCKERS: AvailabilityBlockers = {
  dates: [],
  weekdays: [],
};

function normalizeRange(raw: unknown): AvailabilityRange | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const start_hour = Number(obj.start_hour);
  const end_hour = Number(obj.end_hour);
  const normalized = {
    start_hour: Number.isFinite(start_hour) ? Math.max(0, Math.min(23, start_hour)) : 9,
    end_hour: Number.isFinite(end_hour) ? Math.max(1, Math.min(24, end_hour)) : 17,
  };
  if (normalized.start_hour >= normalized.end_hour) return null;
  return normalized;
}

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
    const explicitRanges = Array.isArray(obj.ranges)
      ? obj.ranges
          .map((range) => normalizeRange(range))
          .filter((range): range is AvailabilityRange => Boolean(range))
          .sort((a, b) => a.start_hour - b.start_hour)
      : [];
    const legacyRange = normalizeRange({
      start_hour: obj.start_hour,
      end_hour: obj.end_hour,
    });
    const ranges =
      explicitRanges.length > 0
        ? explicitRanges
        : enabled && legacyRange
          ? [legacyRange]
          : [];
    const firstRange = ranges[0] ?? { start_hour: 9, end_hour: 17 };
    const lastRange = ranges[ranges.length - 1] ?? firstRange;
    next[key] = {
      enabled: enabled && ranges.length > 0,
      start_hour: firstRange.start_hour,
      end_hour: lastRange.end_hour,
      ranges,
    };
  }

  return next;
}

export function normalizeAvailabilityBlockers(input: unknown): AvailabilityBlockers {
  if (!input || typeof input !== "object") return DEFAULT_AVAILABILITY_BLOCKERS;
  const raw = input as Record<string, unknown>;
  const dates = Array.isArray(raw.dates)
    ? raw.dates.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
    : [];
  const weekdays = Array.isArray(raw.weekdays)
    ? raw.weekdays
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  return {
    dates: [...new Set(dates)].sort(),
    weekdays: [...new Set(weekdays)].sort((a, b) => a - b),
  };
}

export function getWeeklyAvailabilityValidationError(
  weekly: WeeklyAvailability
): { day: string; message: string } | null {
  for (let day = 0; day <= 6; day += 1) {
    const row = weekly[String(day)];
    if (!row?.enabled) continue;
    if (!Array.isArray(row.ranges) || row.ranges.length === 0) {
      return { day: String(day), message: "Add at least one time range." };
    }
    for (let index = 0; index < row.ranges.length; index += 1) {
      const current = row.ranges[index];
      if (current.start_hour >= current.end_hour) {
        return { day: String(day), message: "End time must be after start time." };
      }
      if (index > 0) {
        const previous = row.ranges[index - 1];
        if (current.start_hour < previous.end_hour) {
          return { day: String(day), message: "Time ranges cannot overlap." };
        }
      }
    }
  }

  return null;
}

// ── Custom form question types ─────────────────────────────────────────────

export type QuestionType = "short_text" | "long_text" | "phone" | "select" | "multi_select";

export type CustomQuestion = {
  id: string;          // nanoid-style short ID, e.g. "q_abc123"
  label: string;       // question text shown to booker
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  options?: string[];          // for select / multi_select
  allow_other?: boolean;       // show free-text "Other" option
  max_selections?: number | null; // multi_select only: cap on choices
};

/** Sanitise/validate a list of custom questions coming from API payloads */
export function normalizeCustomQuestions(raw: unknown): CustomQuestion[] {
  if (!Array.isArray(raw)) return [];
  const valid: CustomQuestion[] = [];
  const VALID_TYPES: QuestionType[] = ["short_text", "long_text", "phone", "select", "multi_select"];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    if (typeof q.id !== "string" || !q.id) continue;
    if (typeof q.label !== "string" || !q.label.trim()) continue;
    if (!VALID_TYPES.includes(q.type as QuestionType)) continue;
    valid.push({
      id: q.id,
      label: String(q.label).slice(0, 300),
      type: q.type as QuestionType,
      required: Boolean(q.required),
      placeholder: typeof q.placeholder === "string" ? q.placeholder.slice(0, 200) : undefined,
      options: Array.isArray(q.options)
        ? (q.options as unknown[]).filter((o): o is string => typeof o === "string" && o.trim().length > 0).slice(0, 100)
        : undefined,
      allow_other: Boolean(q.allow_other),
      max_selections:
        typeof q.max_selections === "number" && q.max_selections > 0
          ? Math.round(q.max_selections)
          : undefined,
    });
    if (valid.length >= 4) break; // max 4 custom questions (6 total incl. Name + Email)
  }
  return valid;
}

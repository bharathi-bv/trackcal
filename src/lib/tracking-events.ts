export const TRACKING_EVENT_KEYS = [
  "booking_pageview",
  "slot_selected",
  "booking_conversion",
] as const;

export type TrackingEventKey = (typeof TRACKING_EVENT_KEYS)[number];

export type TrackingEventAliases = Partial<Record<TrackingEventKey, string>>;

export const DEFAULT_TRACKING_EVENT_NAMES: Record<TrackingEventKey, string> = {
  booking_pageview: "booking_pageview",
  slot_selected: "slot_selected",
  booking_conversion: "booking_conversion",
};

export function normalizeTrackingEventAliases(input: unknown): TrackingEventAliases {
  if (!input || typeof input !== "object") return {};

  const aliases: TrackingEventAliases = {};
  for (const key of TRACKING_EVENT_KEYS) {
    const raw = (input as Record<string, unknown>)[key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    aliases[key] = trimmed;
  }
  return aliases;
}

export function resolveTrackingEventName(
  key: TrackingEventKey,
  aliases?: TrackingEventAliases | null
) {
  const override = aliases?.[key]?.trim();
  if (override) return override;
  return DEFAULT_TRACKING_EVENT_NAMES[key];
}

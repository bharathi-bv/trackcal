"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DEFAULT_AVAILABILITY_BLOCKERS,
  DEFAULT_WEEKLY_AVAILABILITY,
  getWeeklyAvailabilityValidationError,
  normalizeAvailabilityBlockers,
  normalizeWeeklyAvailability,
  type AvailabilityBlockers,
  type WeeklyAvailability,
} from "@/lib/event-type-config";
import WeeklyAvailabilityEditor from "@/components/dashboard/WeeklyAvailabilityEditor";
import {
  buildPublicBookingPath,
  buildPublicBookingUrl,
  shouldUseBookPathPrefix,
} from "@/lib/public-booking-links";
import type {
  TeamAvailabilityMember,
  TeamAvailabilitySlotMeta,
  TeamSchedulingMode,
} from "@/lib/team-scheduling";
import type { CustomQuestion, QuestionType } from "@/lib/event-type-config";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  google_refresh_token: string | null;
  microsoft_refresh_token?: string | null;
};

export type EventType = {
  id: string;
  name: string;
  slug: string;
  duration: number;
  description: string | null;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
  title_template: string | null;
  location_type: "google_meet" | "zoom" | "phone" | "custom" | "none";
  location_value: string | null;
  min_notice_hours: number;
  max_days_in_advance: number;
  booking_window_type: "rolling" | "fixed";
  booking_window_start_date: string | null;
  booking_window_end_date: string | null;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  max_bookings_per_day: number | null;
  max_bookings_per_slot: number | null;
  availability_schedule_id?: string | null;
  weekly_availability: WeeklyAvailability | null;
  blocked_dates: string[] | null;
  blocked_weekdays: number[] | null;
  is_active: boolean;
  assigned_member_ids: string[];
  team_scheduling_mode: TeamSchedulingMode;
  collective_required_member_ids: string[];
  collective_show_availability_tiers: boolean;
  collective_min_available_hosts: number | null;
  utm_links: UtmLinkPreset[];
  custom_css: string | null;
  custom_questions: CustomQuestion[];
};

export type AvailabilitySchedule = {
  id: string;
  name: string;
  weekly_availability: WeeklyAvailability;
  blockers: AvailabilityBlockers;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UtmLinkPreset = {
  id: string;
  description: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
};

type FormState = {
  name: string;
  slug: string;
  duration: number;
  description: string;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
  title_template: string;
  location_type: "google_meet" | "zoom" | "phone" | "custom" | "none";
  location_value: string;
  min_notice_hours: number;
  max_days_in_advance: number;
  booking_window_type: "rolling" | "fixed";
  booking_window_start_date: string;
  booking_window_end_date: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  max_bookings_per_day: number;
  max_bookings_per_slot: number;
  availability_schedule_id: string;
  weekly_availability: WeeklyAvailability;
  blocked_dates: string[];
  blocked_weekdays: number[];
  use_custom_availability: boolean;
  is_active: boolean;
  assigned_member_ids: string[];
  team_scheduling_mode: TeamSchedulingMode;
  collective_required_member_ids: string[];
  collective_show_availability_tiers: boolean;
  collective_min_available_hosts: number;
  custom_css: string;
  custom_questions: CustomQuestion[];
};

type FormErrors = Partial<Record<string, string>>;

const DEFAULT_FORM: FormState = {
  name: "",
  slug: "",
  duration: 30,
  description: "",
  start_hour: 9,
  end_hour: 17,
  slot_increment: 30,
  title_template: "{event_name} with {invitee_name}",
  location_type: "google_meet",
  location_value: "",
  min_notice_hours: 0,
  max_days_in_advance: 60,
  booking_window_type: "rolling",
  booking_window_start_date: "",
  booking_window_end_date: "",
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  max_bookings_per_day: 0,
  max_bookings_per_slot: 0,
  availability_schedule_id: "",
  weekly_availability: DEFAULT_WEEKLY_AVAILABILITY,
  blocked_dates: [],
  blocked_weekdays: [],
  use_custom_availability: false,
  is_active: true,
  assigned_member_ids: [],
  team_scheduling_mode: "round_robin",
  collective_required_member_ids: [],
  collective_show_availability_tiers: false,
  collective_min_available_hosts: 0,
  custom_css: "",
  custom_questions: [],
};

const DURATIONS = [15, 30, 45, 60, 90, 120];
const INCREMENTS = [
  { value: 15, label: "15 min — 9:00, 9:15, 9:30..." },
  { value: 30, label: "30 min — 9:00, 9:30, 10:00..." },
  { value: 60, label: "60 min — 9:00, 10:00, 11:00..." },
];
const DAYS: Array<{ key: string; label: string }> = [
  { key: "0", label: "Sun" },
  { key: "1", label: "Mon" },
  { key: "2", label: "Tue" },
  { key: "3", label: "Wed" },
  { key: "4", label: "Thu" },
  { key: "5", label: "Fri" },
  { key: "6", label: "Sat" },
];

type SectionKey = "basics" | "location" | "scheduling" | "availability" | "appearance" | "team" | "questions";
const SECTION_TABS: Array<{ key: SectionKey; label: string }> = [
  { key: "basics",       label: "Details"      },
  { key: "location",     label: "Location"     },
  { key: "scheduling",   label: "Timing"       },
  { key: "availability", label: "Schedule"     },
  { key: "appearance",   label: "Appearance"   },
  { key: "team",         label: "Team"         },
  { key: "questions",    label: "Questions"    },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type EventStats = { total: number; thisMonth: number; topSource: string | null };
type AvailabilityDiagnostic = {
  date: string;
  slotCount: number | null;
  reason: string | null;
  error: string | null;
  hostTimezone: string | null;
  slotMeta: TeamAvailabilitySlotMeta[];
  selectedMembers: TeamAvailabilityMember[];
  availabilityTiersEnabled: boolean;
  preferredMinimumHostCount: number | null;
  fallbackMinimumHostCount: number | null;
};

type SchedulingView = "meeting_links" | "appearance";

const UTM_FIELDS: Array<{ key: keyof Omit<UtmLinkPreset, "id" | "description">; label: string; placeholder: string }> = [
  { key: "utm_source", label: "UTM source", placeholder: "linkedin" },
  { key: "utm_medium", label: "UTM medium", placeholder: "paid-social" },
  { key: "utm_campaign", label: "UTM campaign", placeholder: "q2-demo-push" },
  { key: "utm_term", label: "UTM term", placeholder: "buyer-intent" },
  { key: "utm_content", label: "UTM content", placeholder: "video-a" },
];

function createUtmPreset(): UtmLinkPreset {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  };
}

function normalizeUtmLinks(value: unknown): UtmLinkPreset[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === "object" ? item as Partial<UtmLinkPreset> : {};
    return {
      id:
        typeof row.id === "string" && row.id.trim().length > 0
          ? row.id.trim()
          : createUtmPreset().id,
      description: typeof row.description === "string" ? row.description : "",
      utm_source: typeof row.utm_source === "string" ? row.utm_source : "",
      utm_medium: typeof row.utm_medium === "string" ? row.utm_medium : "",
      utm_campaign: typeof row.utm_campaign === "string" ? row.utm_campaign : "",
      utm_term: typeof row.utm_term === "string" ? row.utm_term : "",
      utm_content: typeof row.utm_content === "string" ? row.utm_content : "",
    };
  });
}

function normalizeEventTypeForClient(et: EventType): EventType {
  const blockers = normalizeAvailabilityBlockers({
    dates: et.blocked_dates,
    weekdays: et.blocked_weekdays,
  });
  return {
    ...et,
    weekly_availability: et.weekly_availability
      ? normalizeWeeklyAvailability(et.weekly_availability)
      : null,
    blocked_dates: blockers.dates,
    blocked_weekdays: blockers.weekdays,
    assigned_member_ids: Array.isArray(et.assigned_member_ids) ? et.assigned_member_ids : [],
    collective_required_member_ids: Array.isArray(et.collective_required_member_ids)
      ? et.collective_required_member_ids
      : [],
    team_scheduling_mode: et.team_scheduling_mode ?? "round_robin",
    utm_links: normalizeUtmLinks(et.utm_links),
    custom_css: typeof et.custom_css === "string" ? et.custom_css : "",
    custom_questions: Array.isArray(et.custom_questions) ? et.custom_questions : [],
  };
}

function buildUtmLink(
  baseUrl: string,
  hostPublicSlug: string,
  slug: string,
  preset: UtmLinkPreset
) {
  const fallbackBase = "https://citacal.com";
  const url = new URL(buildPublicBookingUrl(baseUrl || fallbackBase, hostPublicSlug, slug));
  UTM_FIELDS.forEach((field) => {
    const value = preset[field.key].trim();
    if (value) url.searchParams.set(field.key, value);
  });
  return url.toString();
}

function formatAvailabilityReason(reason: string | null) {
  switch (reason) {
    case "available":
      return "Available";
    case "past_date":
      return "Date is in the past";
    case "event_not_found":
      return "Event type not found or inactive";
    case "blocked_date":
      return "Blocked date";
    case "blocked_weekday":
      return "Blocked weekday";
    case "day_disabled":
      return "Day disabled in weekly availability";
    case "outside_booking_window":
      return "Outside booking window";
    case "day_cap_reached":
      return "Max bookings per day reached";
    case "slot_cap_reached":
      return "Max bookings per slot reached";
    case "no_slots":
      return "No free slots (calendar busy)";
    case "calendar_error":
      return "Calendar unavailable or not connected";
    default:
      return "Unknown";
  }
}

function toIsoDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTwelveHourLabel(hours: number, minutes: number) {
  const h12 = hours % 12 || 12;
  const ap = hours < 12 ? "AM" : "PM";
  return `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ap}`;
}

// ── Question editor (used inside the Questions section) ────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  phone: "Phone number",
  select: "Single select",
  multi_select: "Multi-select",
};

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: CustomQuestion;
  index: number;
  onChange: (q: CustomQuestion) => void;
  onRemove: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const needsOptions = question.type === "select" || question.type === "multi_select";

  // Local raw text for the options textarea — lets Enter/Return work naturally.
  // We only parse into options[] on blur, not on every keystroke.
  const [rawOptions, setRawOptions] = useState(() => (question.options ?? []).join("\n"));

  function commitOptions(raw: string) {
    const opts = raw
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    onChange({ ...question, options: opts });
  }

  return (
    <div style={{
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-page)",
      overflow: "hidden",
    }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", width: 18, textAlign: "center", flexShrink: 0 }}>
          {index + 3}
        </span>

        {/* Label */}
        <input
          className="tc-input"
          placeholder="Question label"
          value={question.label}
          onChange={(e) => onChange({ ...question, label: e.target.value })}
          style={{ flex: 1, minWidth: 120 }}
        />

        {/* Type */}
        <div className="tc-select-wrap" style={{ flexShrink: 0, minWidth: 140 }}>
          <select
            className="tc-input"
            value={question.type}
            onChange={(e) => {
              setRawOptions("");
              onChange({ ...question, type: e.target.value as QuestionType, options: [], allow_other: false, max_selections: undefined });
            }}
            style={{ paddingRight: 28 }}
          >
            {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Required toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0, cursor: "pointer", whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onChange({ ...question, required: e.target.checked })}
            style={{ accentColor: "var(--color-primary)" }}
          />
          Required
        </label>

        {/* Options expand (for select types) */}
        {needsOptions && (
          <button
            type="button"
            className="tc-btn tc-btn--ghost tc-btn--sm"
            onClick={() => setShowOptions((p) => !p)}
            style={{ fontSize: 11 }}
          >
            {showOptions ? "▲ Options" : "▼ Options"}
          </button>
        )}

        {/* Remove */}
        <button
          type="button"
          className="tc-btn tc-btn--ghost tc-btn--sm"
          onClick={onRemove}
          style={{ color: "var(--color-danger, #ef4444)", padding: "4px 8px", flexShrink: 0 }}
          title="Remove question"
        >
          ×
        </button>
      </div>

      {/* Options panel */}
      {needsOptions && showOptions && (
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-3) var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          background: "var(--surface-subtle)",
        }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "var(--space-1)" }}>
              Options <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(one per line)</span>
            </label>
            <textarea
              className="tc-input tc-textarea"
              placeholder={"Option 1\nOption 2\nOption 3"}
              rows={5}
              value={rawOptions}
              onChange={(e) => setRawOptions(e.target.value)}
              onBlur={(e) => commitOptions(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>
              {(question.options ?? []).length} option{(question.options ?? []).length !== 1 ? "s" : ""} · Paste a list to bulk-import
            </p>
          </div>

          {/* Max selections — multi_select only */}
          {question.type === "multi_select" && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                Max selections
              </label>
              <input
                type="number"
                className="tc-input"
                min={1}
                max={50}
                placeholder="No limit"
                value={question.max_selections ?? ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10) || 1);
                  onChange({ ...question, max_selections: val });
                }}
                style={{ width: 90, fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Leave blank for no limit</span>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(question.allow_other)}
              onChange={(e) => onChange({ ...question, allow_other: e.target.checked })}
              style={{ accentColor: "var(--color-primary)" }}
            />
            <span>Enable &ldquo;Other&rdquo; — Participants can type a custom answer</span>
          </label>
        </div>
      )}
    </div>
  );
}

function MiniMonthCalendar({ selectedDate, onSelect }: { selectedDate: string; onSelect: (date: string) => void }) {
  const [year, setYear] = useState(() => {
    const d = new Date(selectedDate || Date.now());
    return d.getFullYear();
  });
  const [month, setMonth] = useState(() => {
    const d = new Date(selectedDate || Date.now());
    return d.getMonth();
  });

  const WEEKDAYS_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
  })();

  function buildGrid() {
    const firstDow = new Date(year, month, 1).getDay();
    const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array(mondayOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const grid = buildGrid();

  return (
    <div className="tc-card" style={{ padding: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <button type="button" onClick={() => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); }} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", width: 24, height: 24, cursor: "pointer", fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{MONTHS_SHORT[month]} {year}</span>
        <button type="button" onClick={() => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); }} style={{ background: "none", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", width: 24, height: 24, cursor: "pointer", fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
        {WEEKDAYS_SHORT.map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--color-text-disabled)", padding: "2px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {grid.map((iso, i) => {
          if (!iso) return <div key={`p-${i}`} />;
          const isToday = iso === todayStr;
          const isSelected = iso === selectedDate;
          const isPast = iso < todayStr;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              disabled={isPast}
              style={{
                borderRadius: "var(--radius-sm)",
                padding: "4px 2px",
                border: isSelected ? "1.5px solid var(--color-primary)" : isToday ? "1.5px solid var(--color-primary-border)" : "1px solid transparent",
                background: isSelected ? "var(--color-primary-light)" : "transparent",
                color: isSelected ? "var(--color-primary)" : isToday ? "var(--color-primary)" : isPast ? "var(--color-text-disabled)" : "var(--color-text-secondary)",
                fontSize: 11,
                fontWeight: isSelected || isToday ? 700 : 400,
                cursor: isPast ? "default" : "pointer",
                textAlign: "center",
                lineHeight: 1,
              }}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function EventTypesClient({
  initialEventTypes,
  initialAvailabilitySchedules,
  bookingStats = {},
  availableMembers = [],
  bookingBaseUrl = "",
  hostPublicSlug,
  zoomConnected = false,
}: {
  initialEventTypes: EventType[];
  initialAvailabilitySchedules: AvailabilitySchedule[];
  bookingStats?: Record<string, EventStats>;
  availableMembers?: TeamMember[];
  bookingBaseUrl?: string;
  hostPublicSlug: string;
  zoomConnected?: boolean;
}) {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>(() =>
    initialEventTypes.map((et) => normalizeEventTypeForClient(et))
  );
  const [availabilitySchedules] = useState<AvailabilitySchedule[]>(initialAvailabilitySchedules);
  const [editingFullPage, setEditingFullPage] = useState(false);
  const [meetingLinksTab, setMeetingLinksTab] = useState<"personal" | "team">("personal");
  const [previewDate, setPreviewDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [previewSlots, setPreviewSlots] = useState<{ available: string[]; all: string[] } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDiagnostic, setPreviewDiagnostic] = useState<AvailabilityDiagnostic | null>(null);
  const [previewDiagnosticSlot, setPreviewDiagnosticSlot] = useState<string | null>(null);
  const [previewUsesLocalSource, setPreviewUsesLocalSource] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedUtm, setCopiedUtm] = useState<string | null>(null);
  const [embedFor, setEmbedFor] = useState<EventType | null>(null);
  const [embedCopied, setEmbedCopied] = useState<"script" | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<SchedulingView>("meeting_links");
  const [appearanceDrafts, setAppearanceDrafts] = useState<Record<string, string>>({});
  const [savingAppearanceFor, setSavingAppearanceFor] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("basics");
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [expandedUtmSections, setExpandedUtmSections] = useState<Record<string, boolean>>({});
  const [utmEditor, setUtmEditor] = useState<Record<string, UtmLinkPreset | null>>({});
  const [editingUtmId, setEditingUtmId] = useState<Record<string, string | null>>({});
  const [savingUtmFor, setSavingUtmFor] = useState<string | null>(null);
  const [activeUtmSuggestionField, setActiveUtmSuggestionField] = useState<string | null>(null);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({
    basics: null,
    location: null,
    scheduling: null,
    availability: null,
    appearance: null,
    team: null,
    questions: null,
  });

  const originFallback =
    typeof window !== "undefined" ? window.location.origin : "https://citacal.com";
  const appUrl = bookingBaseUrl.replace(/\/+$/, "") || originFallback;
  const usesBookPrefix = shouldUseBookPathPrefix(appUrl);
  const defaultAvailabilityScheduleId =
    availabilitySchedules.find((schedule) => schedule.is_default)?.id ??
    availabilitySchedules[0]?.id ??
    "";
  const utmSuggestionsByField = UTM_FIELDS.reduce((acc, field) => {
    acc[field.key] = Array.from(
      new Set(
        eventTypes
          .flatMap((eventType) => eventType.utm_links)
          .map((preset) => preset[field.key].trim())
          .filter((value) => value.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
    return acc;
  }, {} as Record<keyof Omit<UtmLinkPreset, "id" | "description">, string[]>);

  function getAppearanceDraft(et: EventType) {
    return appearanceDrafts[et.id] ?? et.custom_css ?? "";
  }

  function updateAppearanceDraft(eventTypeId: string, value: string) {
    setAppearanceDrafts((prev) => ({ ...prev, [eventTypeId]: value }));
  }

  function getUtmSuggestionFieldKey(eventTypeId: string, fieldKey: keyof Omit<UtmLinkPreset, "id" | "description">) {
    return `${eventTypeId}:${fieldKey}`;
  }

  async function saveAppearance(et: EventType) {
    setSavingAppearanceFor(et.id);
    const res = await fetch(`/api/event-types/${et.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_css: getAppearanceDraft(et) }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingAppearanceFor(null);

    if (!res.ok) {
      toast.error((data as { error?: string }).error || "Failed to save custom CSS");
      return;
    }

    setEventTypes((prev) =>
      prev.map((eventType) =>
        eventType.id === et.id
          ? ({ ...eventType, ...data, custom_css: typeof data.custom_css === "string" ? data.custom_css : "" } as EventType)
          : eventType
      )
    );
    setAppearanceDrafts((prev) => ({ ...prev, [et.id]: typeof data.custom_css === "string" ? data.custom_css : "" }));
    toast.success("Custom CSS saved");
  }

  function openCreate() {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      availability_schedule_id: defaultAvailabilityScheduleId,
      blocked_dates: [...DEFAULT_AVAILABILITY_BLOCKERS.dates],
      blocked_weekdays: [...DEFAULT_AVAILABILITY_BLOCKERS.weekdays],
    });
    setFormErrors({});
    setPreviewDate(new Date().toISOString().slice(0, 10));
    setPreviewSlots(null);
    setPreviewDiagnostic(null);
    setEditingFullPage(true);
  }

  function openEdit(et: EventType) {
    setEditing(et);
    setForm({
      name: et.name,
      slug: et.slug,
      duration: et.duration,
      description: et.description ?? "",
      start_hour: et.start_hour,
      end_hour: et.end_hour,
      slot_increment: et.slot_increment,
      title_template: et.title_template ?? "{event_name} with {invitee_name}",
      location_type: et.location_type ?? "google_meet",
      location_value: et.location_value ?? "",
      min_notice_hours: et.min_notice_hours ?? 0,
      max_days_in_advance: et.max_days_in_advance ?? 60,
      booking_window_type: et.booking_window_type ?? "rolling",
      booking_window_start_date: et.booking_window_start_date ?? "",
      booking_window_end_date: et.booking_window_end_date ?? "",
      buffer_before_minutes: et.buffer_before_minutes ?? 0,
      buffer_after_minutes: et.buffer_after_minutes ?? 0,
      max_bookings_per_day: et.max_bookings_per_day ?? 0,
      max_bookings_per_slot: et.max_bookings_per_slot ?? 0,
      availability_schedule_id: et.availability_schedule_id ?? defaultAvailabilityScheduleId,
      weekly_availability: normalizeWeeklyAvailability(et.weekly_availability ?? null),
      blocked_dates: normalizeAvailabilityBlockers({
        dates: et.blocked_dates,
        weekdays: et.blocked_weekdays,
      }).dates,
      blocked_weekdays: normalizeAvailabilityBlockers({
        dates: et.blocked_dates,
        weekdays: et.blocked_weekdays,
      }).weekdays,
      use_custom_availability: et.weekly_availability !== null,
      is_active: et.is_active,
      assigned_member_ids: et.assigned_member_ids ?? [],
      team_scheduling_mode: et.team_scheduling_mode ?? "round_robin",
      collective_required_member_ids: et.collective_required_member_ids ?? [],
      collective_show_availability_tiers: et.collective_show_availability_tiers ?? false,
      collective_min_available_hosts: et.collective_min_available_hosts ?? 0,
      custom_css: et.custom_css ?? "",
      custom_questions: Array.isArray(et.custom_questions) ? et.custom_questions : [],
    });
    setFormErrors({});
    setPreviewDate(new Date().toISOString().slice(0, 10));
    setPreviewSlots(null);
    setPreviewDiagnostic(null);
    setEditingFullPage(true);
  }

  function openDuplicate(et: EventType) {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      name: `${et.name} Copy`,
      slug: `${et.slug}-copy`,
      duration: et.duration,
      description: et.description ?? "",
      start_hour: et.start_hour,
      end_hour: et.end_hour,
      slot_increment: et.slot_increment,
      title_template: et.title_template ?? "{event_name} with {invitee_name}",
      location_type: et.location_type ?? "google_meet",
      location_value: et.location_value ?? "",
      min_notice_hours: et.min_notice_hours ?? 0,
      max_days_in_advance: et.max_days_in_advance ?? 60,
      booking_window_type: et.booking_window_type ?? "rolling",
      booking_window_start_date: et.booking_window_start_date ?? "",
      booking_window_end_date: et.booking_window_end_date ?? "",
      buffer_before_minutes: et.buffer_before_minutes ?? 0,
      buffer_after_minutes: et.buffer_after_minutes ?? 0,
      max_bookings_per_day: et.max_bookings_per_day ?? 0,
      max_bookings_per_slot: et.max_bookings_per_slot ?? 0,
      availability_schedule_id: et.availability_schedule_id ?? defaultAvailabilityScheduleId,
      weekly_availability: normalizeWeeklyAvailability(et.weekly_availability ?? null),
      blocked_dates: normalizeAvailabilityBlockers({
        dates: et.blocked_dates,
        weekdays: et.blocked_weekdays,
      }).dates,
      blocked_weekdays: normalizeAvailabilityBlockers({
        dates: et.blocked_dates,
        weekdays: et.blocked_weekdays,
      }).weekdays,
      use_custom_availability: et.weekly_availability !== null,
      is_active: et.is_active,
      assigned_member_ids: et.assigned_member_ids ?? [],
      team_scheduling_mode: et.team_scheduling_mode ?? "round_robin",
      collective_required_member_ids: et.collective_required_member_ids ?? [],
      collective_show_availability_tiers: et.collective_show_availability_tiers ?? false,
      collective_min_available_hosts: et.collective_min_available_hosts ?? 0,
      custom_css: et.custom_css ?? "",
      custom_questions: Array.isArray(et.custom_questions) ? et.custom_questions : [],
    });
    setFormErrors({});
    setPreviewDate(new Date().toISOString().slice(0, 10));
    setPreviewSlots(null);
    setPreviewDiagnostic(null);
    setEditingFullPage(true);
  }

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !editing) {
        next.slug = slugify(value as string);
      }
      if (field === "assigned_member_ids") {
        const assignedIds = value as string[];
        next.collective_required_member_ids = next.collective_required_member_ids.filter((id) =>
          assignedIds.includes(id)
        );
        if (
          next.collective_min_available_hosts > 0 &&
          next.collective_min_available_hosts > assignedIds.length
        ) {
          next.collective_min_available_hosts = assignedIds.length;
        }
      }
      if (field === "team_scheduling_mode" && value === "round_robin") {
        next.collective_required_member_ids = [];
        next.collective_show_availability_tiers = false;
        next.collective_min_available_hosts = 0;
      }
      if (field === "use_custom_availability" && value === false && !next.availability_schedule_id) {
        next.availability_schedule_id = defaultAvailabilityScheduleId;
      }
      return next;
    });
    // Clear field-level error on change
    if (formErrors[field as string]) {
      setFormErrors((prev) => ({ ...prev, [field as string]: undefined }));
    }
  }

  function computeLocalPreviewSlots(date: string) {
    const schedule = availabilitySchedules.find((s) => s.id === form.availability_schedule_id) ?? null;
    const weekly = form.use_custom_availability
      ? form.weekly_availability
      : schedule?.weekly_availability ?? DEFAULT_WEEKLY_AVAILABILITY;
    const blockers = form.use_custom_availability
      ? {
          dates: form.blocked_dates,
          weekdays: form.blocked_weekdays,
        }
      : schedule?.blockers ?? DEFAULT_AVAILABILITY_BLOCKERS;

    const day = new Date(`${date}T00:00:00`);
    const dayKey = String(day.getDay());
    const dayConfig = weekly[dayKey];
    if (!dayConfig?.enabled) {
      return { all: [] as string[], available: [] as string[], reason: "day_disabled" as const };
    }
    if (blockers.dates.includes(date)) {
      return { all: [] as string[], available: [] as string[], reason: "blocked_date" as const };
    }
    if (blockers.weekdays.includes(day.getDay())) {
      return { all: [] as string[], available: [] as string[], reason: "blocked_weekday" as const };
    }

    const ranges =
      Array.isArray(dayConfig.ranges) && dayConfig.ranges.length > 0
        ? dayConfig.ranges
        : [{ start_hour: dayConfig.start_hour, end_hour: dayConfig.end_hour }];

    const allSet = new Set<string>();
    const increment = form.slot_increment || 30;
    for (const range of ranges) {
      for (let h = range.start_hour; h < range.end_hour; h++) {
        for (let m = 0; m < 60; m += increment) {
          if (h * 60 + m + form.duration > range.end_hour * 60) break;
          allSet.add(toTwelveHourLabel(h, m));
        }
      }
    }
    const all = Array.from(allSet);
    if (all.length === 0) {
      return { all: [], available: [], reason: "no_slots" as const };
    }

    const todayIso = toIsoDateLocal(new Date());
    if (date < todayIso) {
      return { all, available: [], reason: "past_date" as const };
    }

    if (form.booking_window_type === "fixed") {
      if (
        !form.booking_window_start_date ||
        !form.booking_window_end_date ||
        date < form.booking_window_start_date ||
        date > form.booking_window_end_date
      ) {
        return { all, available: [], reason: "outside_booking_window" as const };
      }
    } else {
      const maxDate = new Date();
      maxDate.setHours(0, 0, 0, 0);
      maxDate.setDate(maxDate.getDate() + form.max_days_in_advance);
      if (new Date(`${date}T00:00:00`) > maxDate) {
        return { all, available: [], reason: "outside_booking_window" as const };
      }
    }

    return { all, available: all, reason: "available" as const };
  }

  async function reloadEventTypesFromServer() {
    try {
      const res = await fetch("/api/event-types", { cache: "no-store" });
      if (!res.ok) return null;
      const rows = (await res.json().catch(() => null)) as unknown;
      if (!Array.isArray(rows)) return null;
      const normalized = rows.map((row) => normalizeEventTypeForClient(row as EventType));
      setEventTypes(normalized);
      return normalized;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    const errors: FormErrors = {};

    if (!form.name.trim()) errors.name = "Name is required.";

    if (form.booking_window_type === "fixed") {
      if (!form.booking_window_start_date || !form.booking_window_end_date) {
        errors.booking_window = "Both start and end date are required.";
      } else if (form.booking_window_start_date > form.booking_window_end_date) {
        errors.booking_window = "Start date must be before end date.";
      }
    }

    if (form.use_custom_availability) {
      const validation = getWeeklyAvailabilityValidationError(form.weekly_availability);
      if (validation) {
        const dayLabel = DAYS.find((day) => day.key === validation.day)?.label ?? "Day";
        errors.availability = `${dayLabel}: ${validation.message}`;
      }
    } else if (!form.availability_schedule_id) {
      errors.availability = "Select an availability schedule or add a custom schedule.";
    }

    if (
      form.team_scheduling_mode === "collective" &&
      form.assigned_member_ids.length === 0
    ) {
      errors.team = "Select at least one team member for collective meetings.";
    }

    if (
      form.collective_min_available_hosts > 0 &&
      form.collective_min_available_hosts > form.assigned_member_ids.length
    ) {
      errors.team = "Minimum available hosts cannot exceed the selected team members.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSaving(true);

    const { use_custom_availability, ...formRest } = form;
    const payload = {
      ...formRest,
      slug: form.slug.trim() || slugify(form.name),
      availability_schedule_id: use_custom_availability ? null : form.availability_schedule_id || null,
      weekly_availability: use_custom_availability ? form.weekly_availability : null,
      blocked_dates: use_custom_availability ? form.blocked_dates : [],
      blocked_weekdays: use_custom_availability ? form.blocked_weekdays : [],
      booking_window_start_date:
        form.booking_window_type === "fixed" ? form.booking_window_start_date || null : null,
      booking_window_end_date:
        form.booking_window_type === "fixed" ? form.booking_window_end_date || null : null,
      max_bookings_per_day: form.max_bookings_per_day > 0 ? form.max_bookings_per_day : null,
      max_bookings_per_slot: form.max_bookings_per_slot > 0 ? form.max_bookings_per_slot : null,
      collective_min_available_hosts:
        form.collective_min_available_hosts > 0 ? form.collective_min_available_hosts : null,
    };

    const url = editing ? `/api/event-types/${editing.id}` : "/api/event-types";
    const method = editing ? "PATCH" : "POST";

    let res: Response;
    let data: unknown;
    let rawText = "";
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      rawText = await res.text();
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }
    } catch {
      setFormErrors({ _general: "Failed to save. Check your connection and try again." });
      setSaving(false);
      return;
    }

    if (!res.ok) {
      const errorMessage =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "Failed to save.";
      setFormErrors({ _general: errorMessage });
      setSaving(false);
      return;
    }

    if (editing) {
      // Existing link saved — update list in place, stay on the edit panel
      setEventTypes((prev) =>
        prev.map((e) =>
          e.id === editing.id ? ({ ...e, ...payload, id: editing.id } as EventType) : e
        )
      );
      toast.success("Booking link saved");
      setSaving(false);
      // Stay open — do NOT close the panel
      void reloadEventTypesFromServer();
      router.refresh();
      return;
    } else {
      // New link created — add to list, make it visible in filters/tabs, and close panel
      const payloadAssignedIds = Array.isArray(payload.assigned_member_ids)
        ? payload.assigned_member_ids
        : [];
      let createdAssignedIds = payloadAssignedIds;
      let createdId: string | null = null;
      if (data && typeof data === "object" && "id" in data && typeof data.id === "string") {
        const created = data as EventType;
        createdId = created.id;
        const normalizedAssignedIds = Array.isArray(created.assigned_member_ids)
          ? created.assigned_member_ids
          : [];
        createdAssignedIds = normalizedAssignedIds;
        setEventTypes((prev) => [
          ...prev,
          normalizeEventTypeForClient({
            ...created,
            assigned_member_ids: normalizedAssignedIds,
          } as EventType),
        ]);
      }
      if (!createdId) {
        const contentType = res.headers.get("content-type") ?? "unknown";
        const responseHint = rawText.trim().slice(0, 140);
        setFormErrors({
          _general:
            `Create returned an unexpected response (status ${res.status}, content-type ${contentType}). ` +
            `Please refresh and try again. ${responseHint ? `Response preview: ${responseHint}` : ""}`,
        });
        setSaving(false);
        return;
      }
      setMeetingLinksTab(createdAssignedIds.length > 0 ? "team" : "personal");
      setStatusFilter("all");
      setQuery("");
      const refreshed = await reloadEventTypesFromServer();
      if (refreshed && !refreshed.some((et) => et.id === createdId)) {
        setFormErrors({
          _general:
            "Create API returned success, but the new row is missing after refresh. " +
            "This usually means the app and the Supabase project you are checking are different.",
        });
        setSaving(false);
        return;
      }
      toast.success("Booking link created");
    }

    setSaving(false);
    setEditingFullPage(false);
    setEditing(null);
    void reloadEventTypesFromServer();
    router.refresh();
  }

  async function handleDelete(et: EventType) {
    if (
      !confirm(
        `Delete "${et.name}"? This cannot be undone.\n\nAll booking history for this event will be permanently lost. To keep history and stop new bookings, deactivate it instead.`
      )
    )
      return;

    // Optimistic removal
    const previous = [...eventTypes];
    setEventTypes((prev) => prev.filter((e) => e.id !== et.id));

    const res = await fetch(`/api/event-types/${et.id}`, { method: "DELETE" });
    if (!res.ok) {
      setEventTypes(previous); // Revert
      toast.error("Failed to delete. Try again.");
    } else {
      toast.success(`"${et.name}" deleted`);
      router.refresh();
    }
  }

  function cancelEdit() {
    setEditingFullPage(false);
    setEditing(null);
    setFormErrors({});
    setPreviewSlots(null);
    setPreviewDiagnostic(null);
    setPreviewDiagnosticSlot(null);
  }

  async function fetchPreviewSlots(date: string) {
    const slug = form.slug?.trim();
    if (!slug || !date) { setPreviewSlots(null); return; }
    setPreviewLoading(true);
    setPreviewSlots(null);
    setPreviewDiagnostic(null);
    const shouldUseLocalPreview = !editing || (editing && slug !== editing.slug);
    if (shouldUseLocalPreview) {
      const local = computeLocalPreviewSlots(date);
      setPreviewSlots({ available: local.available, all: local.all });
      setPreviewUsesLocalSource(true);
      setPreviewLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}&event=${encodeURIComponent(slug)}`);
      const data = await res.json();
      const available: string[] = Array.isArray(data.slots) ? data.slots : [];
      const local = computeLocalPreviewSlots(date);
      const all: string[] = local.all;
      if (data?.reason === "event_not_found") {
        setPreviewSlots({ available: local.available, all: local.all });
        setPreviewUsesLocalSource(true);
        return;
      }
      setPreviewSlots({ available, all });
      setPreviewUsesLocalSource(false);
    } catch {
      const local = computeLocalPreviewSlots(date);
      setPreviewSlots({ available: local.available, all: local.all });
      setPreviewUsesLocalSource(true);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function fetchPreviewDiagnostic(date: string) {
    const slug = form.slug?.trim();
    if (!slug || !date) return;
    if (previewUsesLocalSource) {
      const local = computeLocalPreviewSlots(date);
      const diag: AvailabilityDiagnostic = {
        date,
        slotCount: local.available.length,
        reason: local.reason,
        error: local.reason === "available" ? null : "Preview uses unsaved schedule settings.",
        hostTimezone: null,
        slotMeta: [],
        selectedMembers: [],
        availabilityTiersEnabled: false,
        preferredMinimumHostCount: null,
        fallbackMinimumHostCount: null,
      };
      setPreviewDiagnostic(diag);
      return;
    }
    setDiagnosticLoading(true);
    setPreviewDiagnostic(null);
    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}&event=${encodeURIComponent(slug)}&details=1`);
      const data = await res.json() as {
        slots?: string[] | null; reason?: string; error?: string; hostTimezone?: string;
        slotMeta?: TeamAvailabilitySlotMeta[]; selectedMembers?: TeamAvailabilityMember[];
        availabilityTiersEnabled?: boolean; preferredMinimumHostCount?: number; fallbackMinimumHostCount?: number | null;
      };
      const diag: AvailabilityDiagnostic = {
        date,
        slotCount: Array.isArray(data.slots) ? data.slots.length : null,
        reason: typeof data.reason === "string" ? data.reason : null,
        error: typeof data.error === "string" ? data.error : null,
        hostTimezone: data.hostTimezone ?? null,
        slotMeta: data.slotMeta ?? [],
        selectedMembers: data.selectedMembers ?? [],
        availabilityTiersEnabled: data.availabilityTiersEnabled ?? false,
        preferredMinimumHostCount: typeof data.preferredMinimumHostCount === "number" ? data.preferredMinimumHostCount : null,
        fallbackMinimumHostCount: data.fallbackMinimumHostCount ?? null,
      };
      setPreviewDiagnostic(diag);
    } catch {
      const diag: AvailabilityDiagnostic = { date, slotCount: null, reason: null, error: "Failed to fetch diagnostics.", hostTimezone: null, slotMeta: [], selectedMembers: [], availabilityTiersEnabled: false, preferredMinimumHostCount: null, fallbackMinimumHostCount: null };
      setPreviewDiagnostic(diag);
    } finally {
      setDiagnosticLoading(false);
    }
  }

  async function handleToggle(et: EventType) {
    // Optimistic flip
    setEventTypes((prev) =>
      prev.map((e) => (e.id === et.id ? { ...e, is_active: !e.is_active } : e))
    );

    const res = await fetch(`/api/event-types/${et.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !et.is_active }),
    });

    if (!res.ok) {
      // Revert
      setEventTypes((prev) =>
        prev.map((e) => (e.id === et.id ? { ...e, is_active: et.is_active } : e))
      );
      toast.error("Failed to update. Try again.");
    } else {
      toast.success(et.is_active ? "Deactivated" : "Activated");
      router.refresh();
    }
  }

  function toggleUtmSection(et: EventType) {
    setExpandedUtmSections((prev) => ({ ...prev, [et.id]: !prev[et.id] }));
  }

  function startCreateUtmLink(et: EventType) {
    setExpandedUtmSections((prev) => ({ ...prev, [et.id]: true }));
    setEditingUtmId((prev) => ({ ...prev, [et.id]: null }));
    setUtmEditor((prev) => ({ ...prev, [et.id]: createUtmPreset() }));
  }

  function startEditUtmLink(et: EventType, preset: UtmLinkPreset) {
    setExpandedUtmSections((prev) => ({ ...prev, [et.id]: true }));
    setEditingUtmId((prev) => ({ ...prev, [et.id]: preset.id }));
    setUtmEditor((prev) => ({ ...prev, [et.id]: { ...preset } }));
  }

  function cancelUtmEditor(eventTypeId: string) {
    setEditingUtmId((prev) => ({ ...prev, [eventTypeId]: null }));
    setUtmEditor((prev) => ({ ...prev, [eventTypeId]: null }));
  }

  function updateUtmEditorField(
    eventTypeId: string,
    field: keyof Omit<UtmLinkPreset, "id">,
    value: string
  ) {
    setUtmEditor((prev) => ({
      ...prev,
      [eventTypeId]: prev[eventTypeId]
        ? { ...prev[eventTypeId]!, [field]: value }
        : prev[eventTypeId],
    }));
  }

  async function persistUtmLinks(et: EventType, nextLinks: UtmLinkPreset[], successMessage: string) {
    setSavingUtmFor(et.id);
    const res = await fetch(`/api/event-types/${et.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utm_links: nextLinks }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingUtmFor(null);

    if (!res.ok) {
      toast.error(data.error || "Failed to save UTM links");
      return;
    }

    const normalizedLinks = normalizeUtmLinks(data.utm_links ?? nextLinks);
    setEventTypes((prev) =>
      prev.map((eventType) =>
        eventType.id === et.id
          ? ({ ...eventType, ...data, utm_links: normalizedLinks } as EventType)
          : eventType
      )
    );
    toast.success(successMessage);
    return normalizedLinks;
  }

  async function saveUtmLink(et: EventType) {
    const draft = utmEditor[et.id];
    if (!draft) return;

    const cleanedDraft = {
      ...draft,
      description: draft.description.trim(),
      utm_source: draft.utm_source.trim(),
      utm_medium: draft.utm_medium.trim(),
      utm_campaign: draft.utm_campaign.trim(),
      utm_term: draft.utm_term.trim(),
      utm_content: draft.utm_content.trim(),
    };

    const nextLinks =
      editingUtmId[et.id] === null || editingUtmId[et.id] === undefined
        ? [...et.utm_links, cleanedDraft]
        : et.utm_links.map((preset) =>
            preset.id === editingUtmId[et.id] ? cleanedDraft : preset
          );

    const savedLinks = await persistUtmLinks(
      et,
      nextLinks,
      editingUtmId[et.id] ? "UTM link updated" : "UTM link created"
    );
    if (!savedLinks) return;
    cancelUtmEditor(et.id);
  }

  async function removeUtmLink(et: EventType, presetId: string) {
    const target = et.utm_links.find((preset) => preset.id === presetId);
    const label = target?.description.trim() || "this UTM link";
    if (!confirm(`Remove ${label}?`)) return;
    const nextLinks = et.utm_links.filter((preset) => preset.id !== presetId);
    const savedLinks = await persistUtmLinks(et, nextLinks, "UTM link removed");
    if (!savedLinks) return;
    if (editingUtmId[et.id] === presetId) {
      cancelUtmEditor(et.id);
    }
  }

  async function copyLink(slug: string) {
    const link = buildPublicBookingUrl(appUrl, hostPublicSlug, slug);
    await navigator.clipboard.writeText(link);
    setCopied(slug);
    toast.success("Link copied");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyUtmLink(slug: string, preset: UtmLinkPreset) {
    const link = buildUtmLink(appUrl, hostPublicSlug, slug, preset);
    await navigator.clipboard.writeText(link);
    const copyKey = `${slug}:${preset.id}`;
    setCopiedUtm(copyKey);
    toast.success("UTM link copied");
    setTimeout(() => setCopiedUtm((current) => (current === copyKey ? null : current)), 2000);
  }

  function buildScriptEmbedCode(slug: string) {
    return [
      `<script async src="${appUrl}/citacal-embed.js" data-citacal-url="${appUrl}"></script>`,
      `<div data-citacal-embed data-host="${hostPublicSlug}" data-event="${slug}" data-height="760"></div>`,
    ].join("\n");
  }

  async function copyEmbed(kind: "script", slug: string) {
    const code = buildScriptEmbedCode(slug);
    await navigator.clipboard.writeText(code);
    setEmbedCopied(kind);
    toast.success("Script embed code copied");
    setTimeout(() => setEmbedCopied(null), 1800);
  }

  const filteredEventTypes = eventTypes.filter((et) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      et.name.toLowerCase().includes(q) ||
      et.slug.toLowerCase().includes(q) ||
      (et.description ?? "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && et.is_active) ||
      (statusFilter === "inactive" && !et.is_active);
    return matchesQuery && matchesStatus;
  });

  const tabFilteredEventTypes =
    viewMode === "meeting_links"
      ? filteredEventTypes.filter((et) =>
          meetingLinksTab === "personal"
            ? et.assigned_member_ids.length === 0
            : et.assigned_member_ids.length > 0
        )
      : filteredEventTypes;
  const selectedTeamMembers = availableMembers.filter((member) =>
    form.assigned_member_ids.includes(member.id)
  );

  function scrollToSection(key: SectionKey) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (!editingFullPage) return;
    const root = drawerScrollRef.current;
    if (!root) return;

    const onScroll = () => {
      const probeTop = root.getBoundingClientRect().top + 120;
      let current: SectionKey = "basics";
      for (const tab of SECTION_TABS) {
        const el = sectionRefs.current[tab.key];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeTop) current = tab.key;
      }
      setActiveSection(current);
    };

    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [editingFullPage]);

  return (
    <>
      {editingFullPage ? null : (
      <><div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Booking Links
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Create shareable booking links and customize how each booking page looks.
          </p>
        </div>
        {viewMode === "meeting_links" && (
          <button className="tc-btn tc-btn--primary" onClick={openCreate}>
            + New Booking Link
          </button>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: "2px solid var(--border-default)", marginBottom: "var(--space-6)" }}>
        {(["meeting_links", "appearance"] as const).map((mode) => {
          const label = mode === "meeting_links" ? "Booking Links" : "Appearance";
          const isActive = viewMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "var(--space-3) var(--space-5)",
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? "var(--blue-400)" : "var(--text-secondary)",
                border: "none",
                borderBottom: isActive ? "2px solid var(--blue-400)" : "2px solid transparent",
                marginBottom: -2,
                background: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-sans)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {viewMode === "appearance" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="tc-card" style={{ padding: "var(--space-5) var(--space-6)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Custom CSS by booking link
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "6px 0 0", lineHeight: 1.6 }}>
              Add CSS that applies only to a specific booking page. Availability stays in the separate Availability page.
            </p>
          </div>

          {eventTypes.length === 0 ? (
            <div className="tc-card" style={{ padding: "var(--space-12)", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
                Create a booking link first, then customize its appearance here.
              </p>
            </div>
          ) : (
            eventTypes.map((et) => (
              <div key={et.id} className="tc-card" style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{et.name}</span>
                      <code style={{ fontSize: 11, color: "var(--text-tertiary)", background: "var(--surface-subtle)", padding: "2px 6px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                        {buildPublicBookingPath(hostPublicSlug, et.slug, usesBookPrefix)}
                      </code>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "6px 0 0", lineHeight: 1.5 }}>
                      CSS entered here is injected only on this booking link&apos;s public page.
                    </p>
                  </div>
                  <button
                    className="tc-btn tc-btn--primary tc-btn--sm"
                    onClick={() => saveAppearance(et)}
                    disabled={savingAppearanceFor === et.id}
                  >
                    {savingAppearanceFor === et.id ? "Saving..." : "Save CSS"}
                  </button>
                </div>

                <textarea
                  className="tc-input tc-textarea"
                  rows={12}
                  placeholder=".citacal-booking-card { border-radius: 28px; }"
                  value={getAppearanceDraft(et)}
                  onChange={(e) => updateAppearanceDraft(et.id, e.target.value)}
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, lineHeight: 1.6 }}
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <>
        {viewMode === "meeting_links" && (
          <div className="tc-tabs-pill" style={{ marginBottom: "var(--space-4)" }}>
            <button
              className={`tc-tab-pill${meetingLinksTab === "personal" ? " active" : ""}`}
              onClick={() => setMeetingLinksTab("personal")}
            >
              Your Links
            </button>
            <button
              className={`tc-tab-pill${meetingLinksTab === "team" ? " active" : ""}`}
              onClick={() => setMeetingLinksTab("team")}
            >
              Team Links
            </button>
          </div>
        )}
      <div
        className="tc-card"
        style={{
          padding: "var(--space-4)",
          marginBottom: "var(--space-4)",
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          className="tc-input"
          placeholder="Search by name, slug, description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 300, maxWidth: "100%" }}
        />
        <div className="tc-select-wrap" style={{ width: 180 }}>
          <select
            className="tc-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {tabFilteredEventTypes.length} of {eventTypes.length}
        </span>
      </div>

      {tabFilteredEventTypes.length === 0 ? (
        <div
          className="tc-card"
          style={{
            padding: "var(--space-12)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <p style={{ fontSize: 14, color: "var(--text-tertiary)", margin: 0 }}>
            No booking links yet. Create one to get a shareable link.
          </p>
          <button className="tc-btn tc-btn--primary" onClick={openCreate}>
            {eventTypes.length === 0 ? "Create your first booking link" : "Create booking link"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {tabFilteredEventTypes.map((et) => (
            (() => {
              const linkedSchedule = availabilitySchedules.find(
                (schedule) => schedule.id === et.availability_schedule_id
              );
              return (
            <div
              key={et.id}
              className="tc-card et-card"
              style={{
                borderLeft: `3px solid ${et.is_active ? "var(--blue-400)" : "var(--border-strong)"}`,
                opacity: et.is_active ? 1 : 0.6,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                padding: "var(--space-5) var(--space-6)",
                transition: "opacity 0.2s, border-color 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-5)",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{et.name}</span>
                    <span className="tc-pill tc-pill--primary" style={{ fontSize: 10 }}>{et.duration} min</span>
                    <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>
                      {et.weekly_availability ? "Custom schedule" : linkedSchedule?.name ?? "Saved schedule"}
                    </span>
                    {!et.is_active && <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>inactive</span>}
                  </div>

                  {et.description && (
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "var(--space-1) 0 0", lineHeight: 1.55 }}>
                      {et.description}
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                    <code style={{ fontSize: 11, color: "var(--text-tertiary)", background: "var(--surface-subtle)", padding: "2px 6px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                      {buildPublicBookingPath(hostPublicSlug, et.slug, usesBookPrefix)}
                    </code>
                    <a
                      href={buildPublicBookingUrl(appUrl, hostPublicSlug, et.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="tc-btn tc-btn--ghost tc-btn--sm"
                      style={{ textDecoration: "none" }}
                    >
                      Open
                    </a>
                    <button
                      className={`tc-btn tc-btn--sm ${copied === et.slug ? "tc-btn--secondary" : "tc-btn--ghost"}`}
                      onClick={() => copyLink(et.slug)}
                    >
                      {copied === et.slug ? "Copied!" : "Copy"}
                    </button>
                    <button
                      className="tc-btn tc-btn--ghost tc-btn--sm"
                      onClick={() => setEmbedFor(et)}
                    >
                      Embed
                    </button>
                  </div>

                  {(() => {
                    const s = bookingStats[et.slug];
                    const total = s?.total ?? 0;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: total > 0 ? "var(--text-secondary)" : "var(--text-disabled)" }}>
                          {total} booking{total !== 1 ? "s" : ""}
                        </span>
                        {s && s.thisMonth > 0 && (
                          <>
                            <span style={{ fontSize: 11, color: "var(--border-default)" }}>·</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-500)" }}>
                              {s.thisMonth} this month
                            </span>
                          </>
                        )}
                        {s?.topSource && (
                          <>
                            <span style={{ fontSize: 11, color: "var(--border-default)" }}>·</span>
                            <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>
                              {s.topSource}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="et-card-actions" style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                  <button
                    onClick={() => handleToggle(et)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: "var(--radius-full)", border: "none",
                      cursor: "pointer", fontSize: 11, fontWeight: 600,
                      background: et.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)",
                      color: et.is_active ? "#059669" : "#dc2626",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                    {et.is_active ? "Active" : "Inactive"}
                  </button>
                  <button className="tc-btn tc-btn--secondary tc-btn--sm" onClick={() => openEdit(et)}>
                    Edit
                  </button>
                  <button
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={() => openDuplicate(et)}
                    title="Duplicate"
                    style={{ padding: "0 10px" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                  <button className="tc-btn tc-btn--delete tc-btn--sm" onClick={() => handleDelete(et)}>
                    Delete
                  </button>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-default)",
                  paddingTop: "var(--space-4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                <button
                  type="button"
                  className="tc-btn tc-btn--ghost"
                  onClick={() => toggleUtmSection(et)}
                  style={{
                    alignSelf: "flex-start",
                    padding: 0,
                    height: "auto",
                    border: "none",
                    background: "transparent",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {expandedUtmSections[et.id] ? "▼" : "▶"} UTM Links
                </button>

                {expandedUtmSections[et.id] && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-4)",
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
                      Save reusable UTM versions of this booking link so your team can copy them quickly.
                    </p>

                    {et.utm_links.length === 0 ? (
                      <div
                        style={{
                          padding: "var(--space-4)",
                          borderRadius: "var(--radius-md)",
                          border: "1px dashed var(--border-default)",
                          color: "var(--text-tertiary)",
                          fontSize: 12,
                        }}
                      >
                        No saved UTM links yet.
                      </div>
                    ) : (
                      et.utm_links.map((preset, index) => {
                        const generatedLink = buildUtmLink(appUrl, hostPublicSlug, et.slug, preset);
                        const copiedKey = `${et.slug}:${preset.id}`;
                        return (
                          <div
                            key={preset.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "var(--space-2)",
                              padding: "12px 14px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--surface-page)",
                              border: "1px solid var(--border-default)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.25 }}>
                                  {preset.description.trim() || `UTM Link ${index + 1}`}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="tc-btn tc-btn--ghost tc-btn--sm"
                                  onClick={() => startEditUtmLink(et, preset)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="tc-btn tc-btn--ghost tc-btn--sm"
                                  onClick={() => removeUtmLink(et, preset.id)}
                                  style={{ color: "var(--color-danger, #ef4444)" }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                              <code
                                style={{
                                  flex: 1,
                                  minWidth: 260,
                                  padding: "8px 10px",
                                  borderRadius: "var(--radius-md)",
                                  border: "1px solid var(--border-subtle)",
                                  background: "var(--surface-subtle)",
                                  color: "var(--text-tertiary)",
                                  fontSize: 11,
                                  lineHeight: 1.35,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={generatedLink}
                              >
                                {generatedLink}
                              </code>
                                <button
                                  type="button"
                                  className="tc-btn tc-btn--secondary tc-btn--sm"
                                  onClick={() => copyUtmLink(et.slug, preset)}
                                >
                                  {copiedUtm === copiedKey ? "✓ Copied" : "Copy"}
                                </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {utmEditor[et.id] ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--space-3)",
                          padding: "var(--space-4)",
                          borderRadius: "var(--radius-lg)",
                          background: "var(--surface-page)",
                          border: "1px solid var(--border-default)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                            {editingUtmId[et.id] ? "Edit UTM link" : "Add new UTM link"}
                          </span>
                          <button
                            type="button"
                            className="tc-btn tc-btn--ghost tc-btn--sm"
                            onClick={() => cancelUtmEditor(et.id)}
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="tc-form-field" style={{ marginBottom: 0 }}>
                          <label className="tc-form-label">Internal note</label>
                          <input
                            className="tc-input"
                            placeholder="Visible only in the dashboard. Not shown to attendees."
                            value={utmEditor[et.id]?.description ?? ""}
                            onChange={(e) => updateUtmEditorField(et.id, "description", e.target.value)}
                          />
                          <span className="tc-form-hint">
                            Private label for your team. This is never shown to attendees.
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "var(--space-3)",
                          }}
                        >
                          {UTM_FIELDS.map((field) => (
                            <div
                              key={field.key}
                              className="tc-form-field"
                              style={{ marginBottom: 0, position: "relative" }}
                            >
                              <label className="tc-form-label">{field.label}</label>
                              {(() => {
                                const fieldStateKey = getUtmSuggestionFieldKey(et.id, field.key);
                                const inputValue = utmEditor[et.id]?.[field.key] ?? "";
                                const normalizedInput = inputValue.trim().toLowerCase();
                                const suggestions = utmSuggestionsByField[field.key].filter((value) => {
                                  if (!normalizedInput) return true;
                                  return value.toLowerCase().includes(normalizedInput);
                                });
                                const showSuggestions =
                                  activeUtmSuggestionField === fieldStateKey && suggestions.length > 0;

                                return (
                                  <>
                              <input
                                className="tc-input"
                                placeholder={field.placeholder}
                                value={inputValue}
                                onFocus={() => setActiveUtmSuggestionField(fieldStateKey)}
                                onBlur={() => {
                                  window.setTimeout(() => {
                                    setActiveUtmSuggestionField((current) =>
                                      current === fieldStateKey ? null : current
                                    );
                                  }, 120);
                                }}
                                onChange={(e) => updateUtmEditorField(et.id, field.key, e.target.value)}
                              />
                                    {showSuggestions ? (
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: "calc(100% + 6px)",
                                          left: 0,
                                          right: 0,
                                          zIndex: 20,
                                          borderRadius: "var(--radius-md)",
                                          border: "1px solid var(--border-default)",
                                          background: "var(--surface-page)",
                                          boxShadow: "var(--shadow-lg)",
                                          padding: "6px",
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "4px",
                                          maxHeight: 180,
                                          overflowY: "auto",
                                        }}
                                      >
                                        {suggestions.slice(0, 8).map((value) => (
                                          <button
                                            key={value}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              updateUtmEditorField(et.id, field.key, value);
                                              setActiveUtmSuggestionField(null);
                                            }}
                                            style={{
                                              width: "100%",
                                              textAlign: "left",
                                              padding: "8px 10px",
                                              borderRadius: "var(--radius-sm)",
                                              border: "none",
                                              background: "transparent",
                                              color: "var(--text-primary)",
                                              fontSize: 13,
                                              cursor: "pointer",
                                            }}
                                          >
                                            {value}
                                          </button>
                                        ))}
                                      </div>
                                    ) : null}
                                  </>
                                );
                              })()}
                            </div>
                          ))}
                        </div>

                        <div className="tc-form-field" style={{ marginBottom: 0 }}>
                          <label className="tc-form-label">Generated link</label>
                          <input
                            className="tc-input"
                            readOnly
                            value={buildUtmLink(appUrl, hostPublicSlug, et.slug, utmEditor[et.id] ?? createUtmPreset())}
                          />
                          <span className="tc-form-hint">Any blank UTM field is omitted from the final link.</span>
                        </div>

                        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="tc-btn tc-btn--primary tc-btn--sm"
                            onClick={() => saveUtmLink(et)}
                            disabled={savingUtmFor === et.id}
                          >
                            {savingUtmFor === et.id ? "Saving..." : "Save UTM link"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="tc-btn tc-btn--secondary tc-btn--sm"
                        onClick={() => startCreateUtmLink(et)}
                      >
                        + Add new UTM link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
              );
            })()
          ))}
        </div>
      )}
        </>
      )}
      </>
      )}

      {editingFullPage && (
        <div
          ref={drawerScrollRef}
          style={{ position: "fixed", inset: 0, zIndex: 500, background: "var(--color-bg)", overflowY: "auto" }}
        >
          {/* ── Top breadcrumb bar ── */}
          <div style={{
            position: "sticky", top: 0, zIndex: 2,
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--border-default)",
            height: 56,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 var(--space-8)", gap: "var(--space-4)",
          }}>
            {/* Left: breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
              <button
                type="button"
                onClick={cancelEdit}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6, padding: "4px 0", flexShrink: 0 }}
              >
                ← Booking Links
              </button>
              <span style={{ color: "var(--color-text-disabled)", fontSize: 13 }}>/</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {editing ? (form.name || editing.name) : "New Booking Link"}
              </span>
            </div>
            {/* Right: status toggle + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => updateForm("is_active", !form.is_active)}
                style={{
                  padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", border: `1.5px solid ${form.is_active ? "#059669" : "#dc2626"}`,
                  background: form.is_active ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
                  color: form.is_active ? "#059669" : "#dc2626",
                }}
              >
                {form.is_active ? "Active" : "Inactive"}
              </button>
              <button type="button" className="tc-btn tc-btn--secondary tc-btn--sm" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>

          {/* ── Two-column body ── */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(400px, 580px) 1fr", maxWidth: 1320, margin: "0 auto", minHeight: "calc(100vh - 56px)", alignItems: "start" }}>

            {/* ── LEFT: form ── */}
            <div style={{ borderRight: "1px solid var(--border-default)", minHeight: "calc(100vh - 56px)" }}>
              {/* Sticky section tabs */}
              <div style={{ position: "sticky", top: 56, zIndex: 1, background: "var(--color-surface)", borderBottom: "1px solid var(--border-subtle)", padding: "var(--space-3) var(--space-6)" }}>
                <div className="tc-tabs-pill">
                  {SECTION_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`tc-tab-pill${activeSection === tab.key ? " active" : ""}`}
                      onClick={() => scrollToSection(tab.key)}
                      style={{ fontSize: 12 }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form sections body */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-6) var(--space-6)" }}>

              {/* ── BASICS (Details) ── */}
              <section ref={(el) => { sectionRefs.current.basics = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Details</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Name</label>
                <input
                  type="text"
                  className="tc-input"
                  placeholder="15-Min Intro Call"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
                {formErrors.name && <span className="tc-form-hint" style={{ color: "var(--color-danger)" }}>{formErrors.name}</span>}
              </div>

              {/* Duration lives here — most important field after name */}
              <div className="tc-form-field">
                <label className="tc-form-label">Duration</label>
                <div className="tc-select-wrap">
                  <select className="tc-input" value={form.duration} onChange={(e) => updateForm("duration", Number(e.target.value))}>
                    {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">URL slug</label>
                <input type="text" className="tc-input" placeholder="15-min-intro-call" value={form.slug} onChange={(e) => updateForm("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                <span className="tc-form-hint">
                  {`Booking URL: ${buildPublicBookingPath(hostPublicSlug, form.slug || "your-slug", usesBookPrefix)}`}
                </span>
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Description <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(optional)</span></label>
                <textarea className="tc-input tc-textarea" value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={2} placeholder="What this meeting is about." />
              </div>
              </section>

              {/* ── LOCATION ── */}
              <section ref={(el) => { sectionRefs.current.location = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Location</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              {/* Location type as visual option cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                {([
                  { value: "google_meet", label: "Google Meet", icon: "🎥", desc: "Auto-generated link" },
                  { value: "zoom",        label: "Zoom",        icon: "📹", desc: zoomConnected ? "Auto-generated link" : "Requires Zoom connection" },
                  { value: "phone",       label: "Phone",       icon: "📞", desc: "Enter phone number" },
                  { value: "custom",      label: "Custom",      icon: "📍", desc: "Enter any location" },
                  { value: "none",        label: "No location", icon: "—",  desc: "No location shown" },
                ] as { value: FormState["location_type"]; label: string; icon: string; desc: string }[]).map((opt) => {
                  const isActive = form.location_type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm("location_type", opt.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-lg)",
                        border: `1.5px solid ${isActive ? "var(--blue-400)" : "var(--border-default)"}`,
                        background: isActive ? "var(--blue-50)" : "var(--surface-subtle)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--blue-500)" : "var(--text-primary)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Zoom: smart state — connected = auto, not connected = prompt + fallback */}
              {form.location_type === "zoom" && (
                zoomConnected ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", background: "rgba(61,170,122,0.08)", borderRadius: "var(--radius-md)", border: "1px solid rgba(61,170,122,0.20)" }}>
                    <span style={{ fontSize: 13, color: "#2d9969", fontWeight: 600 }}>✓ A unique Zoom link will be auto-generated for each booking.</span>
                  </div>
                ) : (
                  <div style={{ padding: "var(--space-4)", background: "var(--surface-subtle)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Connect Zoom to auto-generate links</p>
                      <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0" }}>Each booking will get a unique Zoom link in the calendar invite and confirmation email.</p>
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                      <Link href="/api/auth/zoom" className="tc-btn tc-btn--secondary tc-btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
                        <svg width="14" height="14" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#2D8CFF"/><path d="M8 14h16a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" fill="white"/><path d="M26 18l8-4v12l-8-4v-4z" fill="white"/></svg>
                        Connect Zoom
                      </Link>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>or enter a static fallback URL below</span>
                    </div>
                    <div className="tc-form-field" style={{ marginBottom: 0 }}>
                      <input className="tc-input" placeholder="https://zoom.us/j/your-room-id" value={form.location_value} onChange={(e) => updateForm("location_value", e.target.value)} />
                    </div>
                  </div>
                )
              )}

              {/* Phone / Custom: just a text input */}
              {(form.location_type === "phone" || form.location_type === "custom") && (
                <div className="tc-form-field">
                  <label className="tc-form-label">{form.location_type === "phone" ? "Phone number" : "Location"}</label>
                  <input className="tc-input" placeholder={form.location_type === "phone" ? "+1 (555) 000-0000" : "e.g. 123 Main St or https://meet.example.com"} value={form.location_value} onChange={(e) => updateForm("location_value", e.target.value)} />
                </div>
              )}
              </section>

              {/* ── SCHEDULING (Timing) ── */}
              <section ref={(el) => { sectionRefs.current.scheduling = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Timing</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              {/* Row 1: slot increment + min notice */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Slot increment</label>
                  <div className="tc-select-wrap">
                    <select className="tc-input" value={form.slot_increment} onChange={(e) => updateForm("slot_increment", Number(e.target.value))}>
                      {INCREMENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Min notice (hrs)</label>
                  <input type="number" min={0} max={720} className="tc-input" value={form.min_notice_hours} onChange={(e) => updateForm("min_notice_hours", Number(e.target.value) || 0)} />
                </div>
              </div>

              {/* Row 2: buffer before + buffer after */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Buffer before (min)</label>
                  <input type="number" min={0} max={240} className="tc-input" value={form.buffer_before_minutes} onChange={(e) => updateForm("buffer_before_minutes", Number(e.target.value) || 0)} />
                </div>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Buffer after (min)</label>
                  <input type="number" min={0} max={240} className="tc-input" value={form.buffer_after_minutes} onChange={(e) => updateForm("buffer_after_minutes", Number(e.target.value) || 0)} />
                </div>
              </div>

              {/* Row 3: booking window */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Booking window</label>
                  <div className="tc-select-wrap">
                    <select className="tc-input" value={form.booking_window_type} onChange={(e) => updateForm("booking_window_type", e.target.value as "rolling" | "fixed")}>
                      <option value="rolling">Rolling (next N days)</option>
                      <option value="fixed">Fixed date range</option>
                    </select>
                  </div>
                </div>
                {form.booking_window_type === "rolling" ? (
                  <div className="tc-form-field" style={{ marginBottom: 0 }}>
                    <label className="tc-form-label">Days in advance</label>
                    <input type="number" min={1} max={365} className="tc-input" value={form.max_days_in_advance} onChange={(e) => updateForm("max_days_in_advance", Number(e.target.value) || 1)} />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div className="tc-form-field" style={{ marginBottom: 0 }}>
                      <label className="tc-form-label">Start date</label>
                      <input type="date" className="tc-input" style={{ borderRadius: "var(--radius-md)" }} value={form.booking_window_start_date} onChange={(e) => updateForm("booking_window_start_date", e.target.value)} />
                    </div>
                    <div className="tc-form-field" style={{ marginBottom: 0 }}>
                      <label className="tc-form-label">End date</label>
                      <input type="date" className="tc-input" style={{ borderRadius: "var(--radius-md)" }} value={form.booking_window_end_date} onChange={(e) => updateForm("booking_window_end_date", e.target.value)} />
                      {formErrors.booking_window && <span className="tc-form-hint" style={{ color: "var(--color-danger)" }}>{formErrors.booking_window}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4: max bookings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Max/day <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(0 = ∞)</span></label>
                  <input type="number" min={0} className="tc-input" value={form.max_bookings_per_day} onChange={(e) => updateForm("max_bookings_per_day", Number(e.target.value) || 0)} />
                </div>
                <div className="tc-form-field" style={{ marginBottom: 0 }}>
                  <label className="tc-form-label">Max/slot <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>(0 = ∞)</span></label>
                  <input type="number" min={0} className="tc-input" value={form.max_bookings_per_slot} onChange={(e) => updateForm("max_bookings_per_slot", Number(e.target.value) || 0)} />
                </div>
              </div>
              </section>

              {/* ── AVAILABILITY (Schedule) ── */}
              <section ref={(el) => { sectionRefs.current.availability = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Schedule</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              {!form.use_custom_availability ? (
                <>
                  <div className="tc-form-field">
                    <label className="tc-form-label">Availability schedule</label>
                    <div className="tc-select-wrap">
                      <select
                        className="tc-input"
                        value={form.availability_schedule_id}
                        onChange={(e) => updateForm("availability_schedule_id", e.target.value)}
                      >
                        {availabilitySchedules.length === 0 && (
                          <option value="">No schedules found — create one in Availability page</option>
                        )}
                        {availabilitySchedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}{s.is_default ? " (default)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formErrors.availability && (
                      <span className="tc-form-hint" style={{ color: "var(--color-danger)" }}>{formErrors.availability}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateForm("use_custom_availability", true)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "var(--color-text-muted)", textDecoration: "underline", textAlign: "left" }}
                  >
                    Use a custom schedule for this event instead
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => updateForm("use_custom_availability", false)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, color: "var(--color-text-muted)", textDecoration: "underline", textAlign: "left", marginBottom: "var(--space-2)" }}
                  >
                    ← Use a saved schedule instead
                  </button>
                  <WeeklyAvailabilityEditor
                    value={form.weekly_availability}
                    onChange={(v) => updateForm("weekly_availability", v)}
                    blockers={{
                      dates: form.blocked_dates,
                      weekdays: form.blocked_weekdays,
                    }}
                    onBlockersChange={(next) => {
                      updateForm("blocked_dates", next.dates);
                      updateForm("blocked_weekdays", next.weekdays);
                    }}
                    showBlockers={false}
                  />
                  {formErrors.availability && (
                    <span className="tc-form-hint" style={{ color: "var(--color-danger)" }}>{formErrors.availability}</span>
                  )}
                </>
              )}
              </section>

              {/* ── APPEARANCE ── */}
              <section ref={(el) => { sectionRefs.current.appearance = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Appearance</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div className="tc-form-field">
                <label className="tc-form-label">Custom CSS</label>
                <textarea
                  className="tc-input tc-textarea"
                  rows={10}
                  placeholder=".citacal-booking-card { border-radius: 28px; }"
                  value={form.custom_css}
                  onChange={(e) => updateForm("custom_css", e.target.value)}
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, lineHeight: 1.6 }}
                />
                <p className="tc-form-hint">
                  Applied only to this booking link&apos;s page. Use CSS selectors to restyle the booking experience for this one event.
                </p>
              </div>
              </section>

              {/* ── TEAM ── */}
              <section ref={(el) => { sectionRefs.current.team = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Team</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              {availableMembers.length === 0 ? (
                <div style={{ padding: "var(--space-4)", background: "var(--surface-subtle)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>No team members yet</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "4px 0 0", fontWeight: 500 }}>
                    Add team members in Settings → Team Members, then assign them here for round-robin scheduling.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, fontWeight: 500 }}>
                    Select which team members can be booked for this event. Leave all unchecked to use single-host scheduling.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {availableMembers.map((m) => {
                      const checked = form.assigned_member_ids.includes(m.id);
                      const calConnected = Boolean(
                        m.google_refresh_token || m.microsoft_refresh_token
                      );
                      return (
                        <label
                          key={m.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "var(--space-3)",
                            padding: "var(--space-3) var(--space-4)",
                            borderRadius: "var(--radius-lg)",
                            border: `1.5px solid ${checked ? "var(--blue-400)" : "var(--border-default)"}`,
                            background: checked ? "var(--blue-50)" : "var(--surface-page)",
                            cursor: "pointer",
                            transition: "border-color 0.15s, background 0.15s",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.assigned_member_ids, m.id]
                                : form.assigned_member_ids.filter((id) => id !== m.id);
                              updateForm("assigned_member_ids", next);
                            }}
                            style={{ width: 14, height: 14, accentColor: "var(--blue-400)", flexShrink: 0 }}
                          />
                          {/* Avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: "var(--radius-full)", flexShrink: 0,
                            background: m.photo_url ? "var(--surface-subtle)" : "var(--blue-400)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden",
                          }}>
                            {m.photo_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={m.photo_url} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : m.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{m.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0, fontWeight: 500 }}>{m.email}</p>
                          </div>
                          {calConnected ? (
                            <span className="tc-pill tc-pill--success" style={{ fontSize: 10, flexShrink: 0 }}>Calendar connected</span>
                          ) : (
                            <span className="tc-pill tc-pill--warning" style={{ fontSize: 10, flexShrink: 0 }}>No calendar — will skip</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {form.assigned_member_ids.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, fontWeight: 500 }}>
                      No members selected — bookings will go to the single host calendar.
                    </p>
                  )}
                  {form.assigned_member_ids.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-4)",
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--border-default)",
                        background: "var(--surface-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                          Team scheduling mode
                        </span>
                        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => updateForm("team_scheduling_mode", "round_robin")}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "var(--radius-full)",
                              border:
                                form.team_scheduling_mode === "round_robin"
                                  ? "1.5px solid var(--blue-400)"
                                  : "1px solid var(--border-default)",
                              background:
                                form.team_scheduling_mode === "round_robin"
                                  ? "var(--blue-50)"
                                  : "var(--surface-page)",
                              color: "var(--text-primary)",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Round robin
                          </button>
                          <button
                            type="button"
                            onClick={() => updateForm("team_scheduling_mode", "collective")}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "var(--radius-full)",
                              border:
                                form.team_scheduling_mode === "collective"
                                  ? "1.5px solid var(--blue-400)"
                                  : "1px solid var(--border-default)",
                              background:
                                form.team_scheduling_mode === "collective"
                                  ? "var(--blue-50)"
                                  : "var(--surface-page)",
                              color: "var(--text-primary)",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Collective meeting
                          </button>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          Round robin books one host. Collective meetings book all available selected hosts for the slot.
                        </span>
                      </div>

                      {form.team_scheduling_mode === "collective" && (
                        <>
                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                              Required hosts for any open slot
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                              Leave all unchecked to require everyone. Select a subset if the meeting can still happen when some optional hosts are unavailable.
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                              {selectedTeamMembers.map((member) => {
                                const checked = form.collective_required_member_ids.includes(member.id);
                                return (
                                  <label
                                    key={member.id}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "6px 10px",
                                      borderRadius: "var(--radius-full)",
                                      border: checked
                                        ? "1px solid rgba(59,130,246,0.28)"
                                        : "1px solid var(--border-default)",
                                      background: checked ? "var(--blue-50)" : "var(--surface-page)",
                                      fontSize: 11,
                                      color: "var(--text-secondary)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...form.collective_required_member_ids, member.id]
                                          : form.collective_required_member_ids.filter((id) => id !== member.id);
                                        updateForm("collective_required_member_ids", next);
                                      }}
                                      style={{ width: 12, height: 12, accentColor: "var(--blue-400)" }}
                                    />
                                    {member.name}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                                  Highlight preferred vs other slots
                                </span>
                                <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
                                  Preferred slots mean every connected host is free. Other slots stay visible when at least N hosts are free.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateForm(
                                    "collective_show_availability_tiers",
                                    !form.collective_show_availability_tiers
                                  )
                                }
                                style={{
                                  position: "relative",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  width: 36,
                                  height: 20,
                                  borderRadius: "var(--radius-full)",
                                  border: "none",
                                  cursor: "pointer",
                                  background: form.collective_show_availability_tiers
                                    ? "var(--blue-400)"
                                    : "var(--border-strong)",
                                }}
                              >
                                <span
                                  style={{
                                    position: "absolute",
                                    top: 2,
                                    left: form.collective_show_availability_tiers ? 18 : 2,
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: "white",
                                    transition: "left 0.2s",
                                  }}
                                />
                              </button>
                            </div>
                            {form.collective_show_availability_tiers && (
                              <div className="tc-form-field" style={{ marginBottom: 0 }}>
                                <label className="tc-form-label">Minimum hosts for also-available slots</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={form.assigned_member_ids.length}
                                  className="tc-input"
                                  value={form.collective_min_available_hosts}
                                  onChange={(e) =>
                                    updateForm(
                                      "collective_min_available_hosts",
                                      Math.min(
                                        form.assigned_member_ids.length,
                                        Math.max(0, Number(e.target.value) || 0)
                                      )
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {formErrors.team && (
                    <p style={{ fontSize: 12, color: "var(--color-danger)", margin: 0 }}>
                      {formErrors.team}
                    </p>
                  )}
                </>
              )}
              </section>

              {/* ── Questions section ── */}
              <section ref={(el) => { sectionRefs.current.questions = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Questions</h3>
                  <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, fontWeight: 500 }}>
                  Name and email are always collected. Add up to 4 more custom questions.
                </p>

                {/* Fixed required fields */}
                {[
                  { label: "Name", hint: "Short text · Required" },
                  { label: "Email address", hint: "Email · Required" },
                ].map((f) => (
                  <div key={f.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border-default)",
                    gap: "var(--space-3)",
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{f.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>{f.hint}</p>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-full)", background: "rgba(61,170,122,0.10)", color: "#2d9969", fontWeight: 600, border: "1px solid rgba(61,170,122,0.20)", whiteSpace: "nowrap" }}>Required</span>
                  </div>
                ))}

                {/* Custom questions */}
                {form.custom_questions.map((q, idx) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    index={idx}
                    onChange={(updated) => {
                      const next = [...form.custom_questions];
                      next[idx] = updated;
                      updateForm("custom_questions", next);
                    }}
                    onRemove={() => {
                      updateForm("custom_questions", form.custom_questions.filter((_, i) => i !== idx));
                    }}
                  />
                ))}

                {form.custom_questions.length < 4 ? (
                  <button
                    type="button"
                    className="tc-btn tc-btn--secondary tc-btn--sm"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => {
                      const id = `q_${Math.random().toString(36).slice(2, 8)}`;
                      updateForm("custom_questions", [
                        ...form.custom_questions,
                        { id, label: "", type: "short_text" as QuestionType, required: false, options: [], allow_other: false },
                      ]);
                    }}
                  >
                    + Add question
                  </button>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
                    Maximum 6 questions allowed — Name and Email are always included.
                  </p>
                )}
              </section>

            </div>{/* end form sections body */}

              {formErrors._general && (
                <div style={{ margin: "0 var(--space-6) var(--space-6)", padding: "var(--space-3) var(--space-4)", background: "var(--color-danger-light)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-danger-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--color-danger-text)" }}>{formErrors._general}</span>
                </div>
              )}
            </div>{/* end LEFT column */}

            {/* ── RIGHT: booking page preview ── */}
            <div style={{ position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)", background: "var(--surface-subtle)" }}>

              {/* Preview label + open link */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Live Preview</span>
                {editing && form.slug ? (
                  <a href={buildPublicBookingUrl(appUrl, hostPublicSlug, form.slug)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>Open ↗</a>
                ) : !editing ? (
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, cursor: "default" }}>Open ↗</span>
                ) : null}
              </div>

              {/* Booking page card */}
              <div className="tc-card" style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

                {/* Event info — styled like booking page */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                    {form.name || "Untitled meeting"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      🕐 {form.duration} min
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      {form.location_type === "google_meet" ? "🎥 Google Meet"
                        : form.location_type === "zoom" ? "📹 Zoom"
                        : form.location_type === "phone" ? "📞 Phone"
                        : form.location_type === "custom" ? `📍 ${form.location_value || "Custom"}`
                        : "—"}
                    </span>
                  </div>
                  {form.description && (
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.6 }}>{form.description}</p>
                  )}
                </div>

                <div style={{ height: 1, background: "var(--border-subtle)" }} />

                {/* Mini calendar */}
                <MiniMonthCalendar
                  selectedDate={previewDate}
                  onSelect={(date) => {
                    setPreviewDate(date);
                    fetchPreviewSlots(date);
                    setPreviewDiagnostic(null);
                    setPreviewDiagnosticSlot(null);
                  }}
                />

                {/* Slots */}
                {previewLoading && (
                  <div style={{ textAlign: "center", padding: "var(--space-3)", color: "var(--text-tertiary)", fontSize: 12 }}>Loading slots…</div>
                )}

                {!previewLoading && previewSlots && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Available times
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        {previewSlots.available.length} of {previewSlots.all.length} open
                      </span>
                    </div>
                    {previewSlots.all.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>No slots in configured range.</p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {previewSlots.all.map((time) => {
                          const isAvailable = previewSlots.available.includes(time);
                          const isClicked = previewDiagnosticSlot === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              title={!isAvailable ? "Click to check why this slot is unavailable" : time}
                              onClick={() => {
                                if (!isAvailable) {
                                  setPreviewDiagnosticSlot(time);
                                  fetchPreviewDiagnostic(previewDate);
                                }
                              }}
                              style={{
                                padding: "8px 6px",
                                borderRadius: "var(--radius-md)",
                                border: isClicked
                                  ? "1.5px solid var(--color-primary)"
                                  : isAvailable
                                  ? "1.5px solid var(--color-primary)"
                                  : "1px solid var(--border-subtle)",
                                background: isAvailable
                                  ? "var(--color-primary-light)"
                                  : isClicked
                                  ? "rgba(123,108,246,0.06)"
                                  : "transparent",
                                color: isAvailable ? "var(--color-primary)" : "var(--text-disabled)",
                                fontSize: 12,
                                fontWeight: isAvailable ? 700 : 400,
                                cursor: isAvailable ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 4,
                                transition: "border-color 0.12s, background 0.12s",
                              }}
                            >
                              <span>{time}</span>
                              {!isAvailable && <span style={{ fontSize: 10, opacity: 0.55 }}>?</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
                      {previewUsesLocalSource
                        ? "Preview shows current unsaved schedule. Save to include calendar-busy checks."
                        : "Grey slots unavailable — click any to diagnose."}
                    </p>
                  </div>
                )}

                {!previewLoading && !previewSlots && form.slug && (
                  <button
                    type="button"
                    className="tc-btn tc-btn--secondary tc-btn--sm"
                    style={{ width: "100%" }}
                    onClick={() => fetchPreviewSlots(previewDate)}
                  >
                    Preview slots for {previewDate}
                  </button>
                )}
              </div>

              {/* Slot-level diagnostic */}
              {diagnosticLoading && (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "var(--space-3)", textAlign: "center" }}>
                  Checking availability…
                </div>
              )}
              {previewDiagnostic && !diagnosticLoading && (
                <div className="tc-card" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}>
                        {previewDiagnosticSlot ? `Why is ${previewDiagnosticSlot} unavailable?` : "Availability diagnostic"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPreviewDiagnostic(null); setPreviewDiagnosticSlot(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-tertiary)", lineHeight: 1, flexShrink: 0 }}
                    >×</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {previewDiagnosticSlot && (previewDiagnostic.reason === "available" || previewDiagnostic.reason === null)
                        ? "Calendar busy at this time"
                        : formatAvailabilityReason(previewDiagnostic.reason)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {(previewDiagnostic.slotCount ?? 0) > 0
                        ? `${previewDiagnostic.slotCount} other slot${previewDiagnostic.slotCount !== 1 ? "s" : ""} available on ${previewDiagnostic.date}`
                        : `No slots available on ${previewDiagnostic.date}`}
                    </span>
                    {previewDiagnostic.hostTimezone && (
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        Timezone: {previewDiagnostic.hostTimezone}
                      </span>
                    )}
                    {previewDiagnostic.error && (
                      <span style={{ fontSize: 12, color: "var(--color-danger-text)" }}>{previewDiagnostic.error}</span>
                    )}
                  </div>
                  {previewDiagnostic.selectedMembers.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {previewDiagnostic.selectedMembers.map((m) => (
                        <span
                          key={m.id}
                          style={{ fontSize: 11, padding: "3px 8px", borderRadius: "var(--radius-full)", background: m.isConnected ? "rgba(15,118,110,0.10)" : "rgba(148,163,184,0.12)", border: m.isConnected ? "1px solid rgba(15,118,110,0.18)" : "1px solid rgba(148,163,184,0.18)", color: m.isConnected ? "var(--text-secondary)" : "var(--text-tertiary)" }}
                        >
                          {m.name}{m.isConnected ? "" : " • no calendar"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>{/* end RIGHT panel */}
          </div>{/* end two-column body */}
        </div>
      )}{/* end editingFullPage */}

      {embedFor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmbedFor(null);
          }}
        >
          <div
            className="tc-card"
            style={{
              width: "min(860px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "var(--space-6)",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                  Embed {embedFor.name}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
                  CitaCal supports JavaScript embed mode only.
                </p>
              </div>
              <button className="tc-btn tc-btn--secondary tc-btn--sm" onClick={() => setEmbedFor(null)}>
                Close
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                    Script Embed (Recommended)
                  </span>
                  <button
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={() => copyEmbed("script", embedFor.slug)}
                  >
                    {embedCopied === "script" ? "✓ Copied" : "Copy code"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "var(--space-3)",
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                    overflowX: "auto",
                    lineHeight: 1.5,
                  }}
                >
                  <code>{buildScriptEmbedCode(embedFor.slug)}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

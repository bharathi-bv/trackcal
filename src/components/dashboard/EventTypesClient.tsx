"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DEFAULT_WEEKLY_AVAILABILITY,
  normalizeWeeklyAvailability,
  type WeeklyAvailability,
} from "@/lib/event-type-config";
import WeeklyAvailabilityEditor from "@/components/dashboard/WeeklyAvailabilityEditor";

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
  weekly_availability: WeeklyAvailability | null;
  blocked_dates: string[] | null;
  is_active: boolean;
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
  weekly_availability: WeeklyAvailability;
  use_custom_availability: boolean;
  is_active: boolean;
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
  weekly_availability: DEFAULT_WEEKLY_AVAILABILITY,
  use_custom_availability: false,
  is_active: true,
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

type SectionKey = "basics" | "scheduling" | "availability" | "limits" | "advanced";
const SECTION_TABS: Array<{ key: SectionKey; label: string }> = [
  { key: "basics", label: "Basics" },
  { key: "scheduling", label: "Scheduling" },
  { key: "availability", label: "Availability" },
  { key: "limits", label: "Limits" },
  { key: "advanced", label: "Advanced" },
];

function hourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function EventTypesClient({
  initialEventTypes,
}: {
  initialEventTypes: EventType[];
}) {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>(initialEventTypes);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [activeSection, setActiveSection] = useState<SectionKey>("basics");
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    basics: null,
    scheduling: null,
    availability: null,
    limits: null,
    advanced: null,
  });

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormErrors({});
    setShowModal(true);
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
      weekly_availability: normalizeWeeklyAvailability(et.weekly_availability ?? null),
      use_custom_availability: et.weekly_availability !== null,
      is_active: et.is_active,
    });
    setFormErrors({});
    setShowModal(true);
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
      weekly_availability: normalizeWeeklyAvailability(et.weekly_availability ?? null),
      use_custom_availability: et.weekly_availability !== null,
      is_active: et.is_active,
    });
    setFormErrors({});
    setShowModal(true);
  }

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !editing) {
        next.slug = slugify(value as string);
      }
      return next;
    });
    // Clear field-level error on change
    if (formErrors[field as string]) {
      setFormErrors((prev) => ({ ...prev, [field as string]: undefined }));
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
      for (const day of DAYS) {
        const row = form.weekly_availability[day.key];
        if (row.enabled && row.start_hour >= row.end_hour) {
          errors.availability = `${day.label}: End time must be after start time.`;
          break;
        }
      }
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
      weekly_availability: use_custom_availability ? form.weekly_availability : null,
      booking_window_start_date:
        form.booking_window_type === "fixed" ? form.booking_window_start_date || null : null,
      booking_window_end_date:
        form.booking_window_type === "fixed" ? form.booking_window_end_date || null : null,
      max_bookings_per_day: form.max_bookings_per_day > 0 ? form.max_bookings_per_day : null,
      max_bookings_per_slot: form.max_bookings_per_slot > 0 ? form.max_bookings_per_slot : null,
    };

    const url = editing ? `/api/event-types/${editing.id}` : "/api/event-types";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setFormErrors({ _general: data.error || "Failed to save." });
      setSaving(false);
      return;
    }

    if (editing) {
      // Optimistic update — no page reload needed for edits
      setEventTypes((prev) =>
        prev.map((e) =>
          e.id === editing.id ? ({ ...e, ...payload, id: editing.id } as EventType) : e
        )
      );
      toast.success("Event type saved");
    } else {
      // New event — use server response if returned, otherwise refresh for the ID
      if (data.data) {
        setEventTypes((prev) => [...prev, data.data as EventType]);
      } else {
        router.refresh();
      }
      toast.success("Event type created");
    }

    setSaving(false);
    setShowModal(false);
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
    }
  }

  async function copyLink(slug: string) {
    const link = `${appUrl}/book?event=${slug}`;
    await navigator.clipboard.writeText(link);
    setCopied(slug);
    toast.success("Link copied");
    setTimeout(() => setCopied(null), 2000);
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

  function scrollToSection(key: SectionKey) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (!showModal) return;
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
  }, [showModal]);

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Event Types
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: "var(--space-1)", fontWeight: 500 }}>
            Create shareable booking links with advanced scheduling rules.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + New Event Type
        </button>
      </div>

      <div
        className="card"
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
          className="input"
          placeholder="Search by name, slug, description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 300, maxWidth: "100%" }}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          style={{ width: 180 }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {filteredEventTypes.length} of {eventTypes.length}
        </span>
      </div>

      {filteredEventTypes.length === 0 ? (
        <div
          className="card"
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
            No event types yet. Create one to get a shareable booking link.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>
            {eventTypes.length === 0 ? "Create your first event type" : "Create event type"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {filteredEventTypes.map((et) => (
            <div
              key={et.id}
              className="card et-card"
              style={{
                borderLeft: `3px solid ${et.is_active ? "var(--blue-400)" : "var(--border-strong)"}`,
                opacity: et.is_active ? 1 : 0.6,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-5)",
                padding: "var(--space-5) var(--space-6)",
                transition: "opacity 0.2s, border-color 0.2s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name row */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{et.name}</span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>{et.duration} min</span>
                  {!et.is_active && <span className="badge badge-default" style={{ fontSize: 10 }}>inactive</span>}
                </div>

                {et.description && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "var(--space-1) 0 0", lineHeight: 1.55 }}>
                    {et.description}
                  </p>
                )}

                {/* Meta row */}
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: "var(--space-2)", fontWeight: 500 }}>
                  {hourLabel(et.start_hour)}–{hourLabel(et.end_hour)}
                  <span style={{ margin: "0 var(--space-2)", opacity: 0.4 }}>·</span>
                  Every {et.slot_increment} min
                  <span style={{ margin: "0 var(--space-2)", opacity: 0.4 }}>·</span>
                  {et.min_notice_hours ?? 0}h notice
                  <span style={{ margin: "0 var(--space-2)", opacity: 0.4 }}>·</span>
                  {et.booking_window_type === "fixed"
                    ? `${et.booking_window_start_date ?? "?"} → ${et.booking_window_end_date ?? "?"}`
                    : `Rolling ${et.max_days_in_advance ?? 60} days`}
                </div>

                {/* Link row */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-2)", flexWrap: "wrap" }}>
                  <code style={{ fontSize: 11, color: "var(--text-tertiary)", background: "var(--surface-subtle)", padding: "2px 6px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                    /book?event={et.slug}
                  </code>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: "2px 8px", height: "auto", color: copied === et.slug ? "var(--success)" : undefined }}
                    onClick={() => copyLink(et.slug)}
                  >
                    {copied === et.slug ? "✓ Copied" : "Copy link"}
                  </button>
                  <a href={`/book?event=${et.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "2px 8px", height: "auto" }}>
                    Open ↗
                  </a>
                </div>
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
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(et)}>
                  Edit
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => openDuplicate(et)} style={{ fontSize: 12 }}>
                  Duplicate
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(et)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "var(--surface-page)",
              position: "absolute",
              top: 0,
              right: 0,
              height: "100vh",
              width: "min(620px, 100vw)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.10)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
            ref={drawerScrollRef}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                background: "var(--surface-page)",
                borderBottom: "1px solid var(--border-default)",
                padding: "var(--space-5) var(--space-6) 0",
              }}
            >
              {/* Title + close */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
                  {editing ? "Edit Event Type" : "New Event Type"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    fontSize: 16,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Pill-style section tabs */}
              <div className="tabs-pill" style={{ marginBottom: "var(--space-1)" }}>
                {SECTION_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`tab-pill${activeSection === tab.key ? " active" : ""}`}
                    onClick={() => scrollToSection(tab.key)}
                    style={{ fontSize: 12 }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-6)" }}>

              {/* ── BASICS ── */}
              <section ref={(el) => { sectionRefs.current.basics = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-tertiary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Basics</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div className="form-field">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className={`input${formErrors.name ? " input-error" : ""}`}
                  placeholder="15-Min Intro Call"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
                {formErrors.name && <span className="form-error">{formErrors.name}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">URL slug</label>
                <input type="text" className="input" placeholder="15-min-intro-call" value={form.slug} onChange={(e) => updateForm("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                <span className="form-hint">Booking URL: /book?event={form.slug || "your-slug"}</span>
              </div>

              <div className="form-field">
                <label className="form-label">Description</label>
                <textarea className="textarea" value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} placeholder="What this meeting is about and who should book it." />
              </div>
              </section>

              {/* ── SCHEDULING ── */}
              <section ref={(el) => { sectionRefs.current.scheduling = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-tertiary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Scheduling</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div className="form-field">
                <label className="form-label">Duration</label>
                <select className="select" value={form.duration} onChange={(e) => updateForm("duration", Number(e.target.value))}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Start time increment</label>
                <select className="select" value={form.slot_increment} onChange={(e) => updateForm("slot_increment", Number(e.target.value))}>
                  {INCREMENTS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Booking window mode</label>
                <select className="select" value={form.booking_window_type} onChange={(e) => updateForm("booking_window_type", e.target.value as "rolling" | "fixed")}>
                  <option value="rolling">Rolling window (next N days)</option>
                  <option value="fixed">Specific date range</option>
                </select>
              </div>

              {form.booking_window_type === "rolling" ? (
                <div className="form-field">
                  <label className="form-label">Rolling window (days)</label>
                  <input type="number" min={1} max={365} className="input" value={form.max_days_in_advance} onChange={(e) => updateForm("max_days_in_advance", Number(e.target.value) || 1)} />
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label className="form-label">Window start date</label>
                    <input type="date" className={`input${formErrors.booking_window ? " input-error" : ""}`} value={form.booking_window_start_date} onChange={(e) => updateForm("booking_window_start_date", e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Window end date</label>
                    <input type="date" className={`input${formErrors.booking_window ? " input-error" : ""}`} value={form.booking_window_end_date} onChange={(e) => updateForm("booking_window_end_date", e.target.value)} />
                    {formErrors.booking_window && <span className="form-error">{formErrors.booking_window}</span>}
                  </div>
                </>
              )}

              <div className="form-field">
                <label className="form-label">Minimum notice (hours)</label>
                <input type="number" min={0} max={720} className="input" value={form.min_notice_hours} onChange={(e) => updateForm("min_notice_hours", Number(e.target.value) || 0)} />
              </div>

              <div className="form-field">
                <label className="form-label">Buffer before event (minutes)</label>
                <input type="number" min={0} max={240} className="input" value={form.buffer_before_minutes} onChange={(e) => updateForm("buffer_before_minutes", Number(e.target.value) || 0)} />
              </div>

              <div className="form-field">
                <label className="form-label">Buffer after event (minutes)</label>
                <input type="number" min={0} max={240} className="input" value={form.buffer_after_minutes} onChange={(e) => updateForm("buffer_after_minutes", Number(e.target.value) || 0)} />
              </div>
              </section>

              {/* ── AVAILABILITY ── */}
              <section ref={(el) => { sectionRefs.current.availability = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-tertiary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Availability</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4)", background: "var(--surface-subtle)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Custom schedule</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: "2px 0 0", fontWeight: 500 }}>
                    {form.use_custom_availability
                      ? "This event uses its own schedule"
                      : "Using your profile availability settings"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm("use_custom_availability", !form.use_custom_availability)}
                  style={{
                    position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0,
                    width: 36, height: 20, borderRadius: "var(--radius-full)", border: "none",
                    cursor: "pointer", transition: "background 0.2s",
                    background: form.use_custom_availability ? "var(--blue-400)" : "var(--border-strong)",
                  }}
                  role="switch"
                  aria-checked={form.use_custom_availability}
                >
                  <span style={{
                    position: "absolute", top: 2,
                    left: form.use_custom_availability ? 18 : 2,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "white", transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>

              {form.use_custom_availability && (
                <WeeklyAvailabilityEditor
                  value={form.weekly_availability}
                  onChange={(v) => updateForm("weekly_availability", v)}
                />
              )}
              {formErrors.availability && <span className="form-error">{formErrors.availability}</span>}
              </section>

              {/* ── LIMITS ── */}
              <section ref={(el) => { sectionRefs.current.limits = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-tertiary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Limits</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div className="form-field">
                <label className="form-label">Max bookings per day (0 = unlimited)</label>
                <input type="number" min={0} className="input" value={form.max_bookings_per_day} onChange={(e) => updateForm("max_bookings_per_day", Number(e.target.value) || 0)} />
              </div>

              <div className="form-field">
                <label className="form-label">Max bookings per slot (0 = unlimited)</label>
                <input type="number" min={0} className="input" value={form.max_bookings_per_slot} onChange={(e) => updateForm("max_bookings_per_slot", Number(e.target.value) || 0)} />
              </div>
              </section>

              {/* ── ADVANCED ── */}
              <section ref={(el) => { sectionRefs.current.advanced = el; }} style={{ scrollMarginTop: 120, display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "var(--text-tertiary)", margin: 0, whiteSpace: "nowrap", textTransform: "uppercase" }}>Advanced</h3>
                <div style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
              </div>

              <div className="form-field">
                <label className="form-label">Event title template</label>
                <input className="input" placeholder="{event_name} with {invitee_name}" value={form.title_template} onChange={(e) => updateForm("title_template", e.target.value)} />
                <span className="form-hint">Available tokens: {'{event_name}'}, {'{invitee_name}'}, {'{host_name}'}</span>
              </div>

              <div className="form-field">
                <label className="form-label">Location type</label>
                <select className="select" value={form.location_type} onChange={(e) => updateForm("location_type", e.target.value as FormState["location_type"])}>
                  <option value="google_meet">Google Meet (default)</option>
                  <option value="zoom">Zoom link</option>
                  <option value="phone">Phone call</option>
                  <option value="custom">Custom text/location</option>
                  <option value="none">No location</option>
                </select>
              </div>

              {(form.location_type === "zoom" || form.location_type === "phone" || form.location_type === "custom") && (
                <div className="form-field">
                  <label className="form-label">Location value</label>
                  <input className="input" placeholder="https://zoom.us/j/... or +1..." value={form.location_value} onChange={(e) => updateForm("location_value", e.target.value)} />
                </div>
              )}

              <div className="form-field">
                <label className="form-label">Status</label>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    onClick={() => updateForm("is_active", true)}
                    style={{
                      padding: "6px 16px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${form.is_active ? "#059669" : "var(--border-default)"}`,
                      background: form.is_active ? "rgba(16,185,129,0.10)" : "transparent",
                      color: form.is_active ? "#059669" : "var(--text-tertiary)",
                    }}
                  >Active</button>
                  <button
                    type="button"
                    onClick={() => updateForm("is_active", false)}
                    style={{
                      padding: "6px 16px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${!form.is_active ? "#dc2626" : "var(--border-default)"}`,
                      background: !form.is_active ? "rgba(239,68,68,0.10)" : "transparent",
                      color: !form.is_active ? "#dc2626" : "var(--text-tertiary)",
                    }}
                  >Inactive</button>
                </div>
              </div>
              </section>

              {formErrors._general && (
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{formErrors._general}</p>
              )}

              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-2)", paddingBottom: "var(--space-4)" }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save changes" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

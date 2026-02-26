"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EventType = {
  id: string;
  name: string;
  slug: string;
  duration: number;
  description: string | null;
  start_hour: number;
  end_hour: number;
  slot_increment: number;
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
  is_active: boolean;
};

const DEFAULT_FORM: FormState = {
  name: "",
  slug: "",
  duration: 30,
  description: "",
  start_hour: 9,
  end_hour: 17,
  slot_increment: 30,
  is_active: true,
};

const DURATIONS = [15, 30, 45, 60, 90, 120];
const INCREMENTS = [
  { value: 15, label: "15 min — 9:00, 9:15, 9:30…" },
  { value: 30, label: "30 min — 9:00, 9:30, 10:00…" },
  { value: 60, label: "60 min — 9:00, 10:00, 11:00…" },
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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
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
      is_active: et.is_active,
    });
    setFormError(null);
    setShowModal(true);
  }

  function updateForm<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-update slug while typing the name (only when creating, not editing)
      if (field === "name" && !editing) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (form.start_hour >= form.end_hour) {
      setFormError("End time must be after start time.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      ...form,
      slug: form.slug.trim() || slugify(form.name),
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
      setFormError(data.error || "Failed to save.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event type? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/event-types/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  async function handleToggle(et: EventType) {
    await fetch(`/api/event-types/${et.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !et.is_active }),
    });
    router.refresh();
  }

  async function copyLink(slug: string) {
    const link = `${appUrl}/book?event=${slug}`;
    await navigator.clipboard.writeText(link);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="dashboard-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            Event Types
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: "var(--space-1)" }}>
            Create shareable booking links with custom durations and availability.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + New Event Type
        </button>
      </div>

      {/* ── Cards ── */}
      {initialEventTypes.length === 0 ? (
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
            Create your first event type
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {initialEventTypes.map((et) => (
            <div
              key={et.id}
              className="card et-card"
              style={{
                borderLeft: `4px solid ${et.is_active ? "var(--blue-400)" : "var(--border-default)"}`,
                opacity: et.is_active ? 1 : 0.65,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-5)",
                padding: "var(--space-5) var(--space-6)",
              }}
            >
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                    {et.name}
                  </span>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>
                    {et.duration} min
                  </span>
                  {!et.is_active && (
                    <span className="badge badge-default" style={{ fontSize: 11 }}>
                      inactive
                    </span>
                  )}
                </div>

                {et.description && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      margin: "var(--space-1) 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {et.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    marginTop: "var(--space-2)",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      fontFamily: "monospace",
                    }}
                  >
                    /book?event={et.slug}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: "2px 8px", height: "auto" }}
                    onClick={() => copyLink(et.slug)}
                  >
                    {copied === et.slug ? "✓ Copied" : "Copy link"}
                  </button>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  {hourLabel(et.start_hour)} – {hourLabel(et.end_hour)} · Slots every{" "}
                  {et.slot_increment} min
                </div>
              </div>

              {/* Actions */}
              <div className="et-card-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleToggle(et)}
                  style={{ fontSize: 12 }}
                >
                  {et.is_active ? "Deactivate" : "Activate"}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(et)}>
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(et.id)}
                  disabled={deleting === et.id}
                >
                  {deleting === et.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit modal ── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-4)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-lg)",
              padding: "var(--space-8)",
              width: "100%",
              maxWidth: 520,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: "0 0 var(--space-6)",
              }}
            >
              {editing ? "Edit Event Type" : "New Event Type"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Name */}
              <div className="form-field">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="30 Minute Meeting"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>

              {/* Slug */}
              <div className="form-field">
                <label className="form-label">URL slug</label>
                <input
                  type="text"
                  className="input"
                  placeholder="30-min"
                  value={form.slug}
                  onChange={(e) =>
                    updateForm(
                      "slug",
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    )
                  }
                />
                <span className="form-hint">/book?event={form.slug || "your-slug"}</span>
              </div>

              {/* Duration */}
              <div className="form-field">
                <label className="form-label">Duration</label>
                <select
                  className="select"
                  value={form.duration}
                  onChange={(e) => updateForm("duration", Number(e.target.value))}
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot increment */}
              <div className="form-field">
                <label className="form-label">Start time increment</label>
                <select
                  className="select"
                  value={form.slot_increment}
                  onChange={(e) => updateForm("slot_increment", Number(e.target.value))}
                >
                  {INCREMENTS.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <span className="form-hint">How often booking slots begin</span>
              </div>

              {/* Available hours */}
              <div className="form-field">
                <label className="form-label">Available hours</label>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  <select
                    className="select"
                    style={{ flex: 1 }}
                    value={form.start_hour}
                    onChange={(e) => updateForm("start_hour", Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {hourLabel(i)}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)", flexShrink: 0 }}>
                    to
                  </span>
                  <select
                    className="select"
                    style={{ flex: 1 }}
                    value={form.end_hour}
                    onChange={(e) => updateForm("end_hour", Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {hourLabel(i)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-field">
                <label className="form-label">
                  Description{" "}
                  <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <textarea
                  className="textarea"
                  placeholder="A quick chat to explore how we can work together."
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                />
              </div>

              {formError && (
                <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{formError}</p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  justifyContent: "flex-end",
                  marginTop: "var(--space-2)",
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

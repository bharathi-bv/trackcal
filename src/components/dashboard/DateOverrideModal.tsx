"use client";

import * as React from "react";

// ── Shared types ────────────────────────────────────────────────────────────────

export type DateOverrideLocal = {
  date: string; // "YYYY-MM-DD"
  ranges: { id: string; start_hour: number; end_hour: number }[];
};

// ── Shared helpers ──────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatHourShort(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  const period = hrs >= 12 ? "pm" : "am";
  const h12 = hrs % 12 === 0 ? 12 : hrs % 12;
  if (mins === 0) return `${h12}${period}`;
  return `${h12}:${String(mins).padStart(2, "0")}${period}`;
}

// ── TimePicker ────────────────────────────────────────────────────────────────
// Masked input [09:30] [AM] — digits-only, colon is fixed (credit-card style)
// value / onChange use fractional hours (9.25 = 9:15 AM, 24 = midnight end-of-day)

function fhToComponents(fh: number): { h12: number; m: number; period: "AM" | "PM" } {
  const totalMins = Math.round(fh * 60);
  const h24 = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const period: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h12, m, period };
}

function componentsToFh(h12: number, m: number, period: "AM" | "PM", isEndTime: boolean): number {
  const h24 = period === "AM" ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
  const fh = h24 + m / 60;
  if (isEndTime && fh === 0) return 24;
  return fh;
}

// fh → "0930" digit string
function fhToDigits(fh: number): string {
  const { h12, m } = fhToComponents(fh);
  return `${String(h12).padStart(2, "0")}${String(m).padStart(2, "0")}`;
}

// "0930" + period → fractional hour, snapping minutes to nearest 15
function digitsToFh(d: string, period: "AM" | "PM", isEndTime: boolean, minFh?: number): number | null {
  const h = parseInt(d.slice(0, 2));
  const m = parseInt(d.slice(2, 4));
  if (h < 1 || h > 12 || m > 59) return null;
  const snapped = Math.min(45, Math.round(m / 15) * 15);
  let fh = componentsToFh(h, snapped, period, isEndTime);
  if (minFh !== undefined && fh <= minFh) fh = Math.min(24, minFh + 0.25);
  return fh;
}

// Display position (0-4 in "09:30") ↔ digit index (0-3 in "0930")
// Position 2 is the colon — skip it
function dispToDigit(dp: number): number { return dp >= 3 ? dp - 1 : dp; }
function digitToDisp(di: number): number { return di >= 2 ? di + 1 : di; }

export function TimePicker({
  value,
  onChange,
  isEndTime = false,
  minFh,
}: {
  value: number;
  onChange: (v: number) => void;
  isEndTime?: boolean;
  minFh?: number;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const focusedRef = React.useRef(false);
  const [digits, setDigits] = React.useState(() => fhToDigits(value));
  const [period, setPeriod] = React.useState<"AM" | "PM">(() => fhToComponents(value).period);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDigits(fhToDigits(value));
      setPeriod(fhToComponents(value).period);
      setError("");
    }
  }, [value]);

  const displayVal = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;

  function commit(d: string, p: "AM" | "PM") {
    const fh = digitsToFh(d, p, isEndTime, minFh);
    if (fh === null) {
      setError("Enter a valid 12-hour time (01:00–12:45)");
      return;
    }
    setError("");
    onChange(fh);
    setDigits(fhToDigits(fh));
    setPeriod(fhToComponents(fh).period);
  }

  function togglePeriod() {
    const p: "AM" | "PM" = period === "AM" ? "PM" : "AM";
    setError("");
    commit(digits, p);
  }

  function setCursor(pos: number) {
    setTimeout(() => inputRef.current?.setSelectionRange(pos, pos), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = inputRef.current!;
    const cur = input.selectionStart ?? 0;

    if (e.key === "Tab") return;
    if (e.key === "Enter") { input.blur(); return; }

    e.preventDefault();

    if (e.key === "ArrowLeft") {
      const next = cur <= 1 ? Math.max(0, cur - 1) : cur === 3 ? 1 : cur - 1;
      input.setSelectionRange(next, next);
      return;
    }
    if (e.key === "ArrowRight") {
      const next = cur === 1 ? 3 : Math.min(5, cur + 1);
      input.setSelectionRange(next, next);
      return;
    }
    if (e.key === "Backspace") {
      let delDisp = cur - 1;
      if (delDisp === 2) delDisp = 1;
      if (delDisp < 0) return;
      const di = dispToDigit(delDisp);
      const next = digits.slice(0, di) + "0" + digits.slice(di + 1);
      setDigits(next);
      setError("");
      setCursor(delDisp);
      return;
    }

    if (!/^\d$/.test(e.key)) return;

    let insertDisp = cur === 2 ? 3 : cur;
    if (insertDisp > 4) return;
    const di = dispToDigit(insertDisp);
    const next = digits.slice(0, di) + e.key + digits.slice(di + 1);
    setDigits(next);
    setError("");
    const nextDisp = insertDisp === 1 ? 3 : Math.min(5, insertDisp + 1);
    setCursor(nextDisp);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          ref={inputRef}
          type="text"
          value={displayVal}
          onChange={() => {/* controlled via keydown */}}
          onFocus={() => {
            focusedRef.current = true;
            setTimeout(() => inputRef.current?.setSelectionRange(0, 0), 0);
          }}
          onBlur={() => { focusedRef.current = false; commit(digits, period); }}
          onMouseUp={() => {
            const pos = inputRef.current?.selectionStart ?? 0;
            if (pos === 2) inputRef.current?.setSelectionRange(3, 3);
          }}
          onKeyDown={handleKeyDown}
          className="tc-input"
          style={{
            width: 62, fontSize: 13, padding: "4px 8px", height: 32,
            textAlign: "center", fontFamily: "var(--font-sans)", letterSpacing: 1,
            borderColor: error ? "#f87171" : undefined,
          }}
        />
        <button
          type="button"
          onClick={togglePeriod}
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "4px 8px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-sans)",
            height: 32,
            minWidth: 44,
          }}
        >
          {period}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.3, paddingLeft: 1 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-md)",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  color: "var(--color-text-muted)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

// ── DateOverrideModal ───────────────────────────────────────────────────────────

export function DateOverrideModal({
  initialOverrides,
  onApply,
  onClose,
}: {
  initialOverrides: DateOverrideLocal[];
  onApply: (overrides: DateOverrideLocal[]) => void;
  onClose: () => void;
}) {
  const todayStr = toISODate(new Date());

  const [calDate, setCalDate] = React.useState<Date>(() => {
    if (initialOverrides.length > 0) {
      const d = new Date(initialOverrides[0].date + "T12:00:00");
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDates, setSelectedDates] = React.useState<string[]>(() =>
    initialOverrides.map((o) => o.date)
  );

  const [ranges, setRanges] = React.useState<{ id: string; start_hour: number; end_hour: number }[]>(() =>
    initialOverrides[0]?.ranges.length
      ? initialOverrides[0].ranges
      : [{ id: "new-0", start_hour: 9, end_hour: 17 }]
  );

  function toggleDate(dateStr: string) {
    if (dateStr < todayStr) return;
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  }

  function prevMonth() {
    setCalDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCalDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function rangesOverlap(rs: { start_hour: number; end_hour: number }[]): boolean {
    const sorted = [...rs].sort((a, b) => a.start_hour - b.start_hour);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start_hour < sorted[i - 1].end_hour) return true;
    }
    return false;
  }

  const lastEnd = ranges.reduce((max, r) => Math.max(max, r.end_hour), 0);
  const canAddMore = lastEnd < 24;
  const overlapError = ranges.length > 1 && rangesOverlap(ranges);

  function addRange() {
    setRanges((prev) => {
      const end = prev.reduce((max, r) => Math.max(max, r.end_hour), 0);
      if (end >= 24) return prev;
      return [...prev, { id: `new-${Date.now()}`, start_hour: end, end_hour: Math.min(end + 1, 24) }];
    });
  }
  function removeRange(id: string) {
    setRanges((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      return remaining.length ? remaining : [{ id: "new-0", start_hour: 9, end_hour: 17 }];
    });
  }
  function updateRange(id: string, patch: { start_hour?: number; end_hour?: number }) {
    setRanges((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  function handleApply() {
    if (selectedDates.length === 0 || overlapError) return;
    const overrides: DateOverrideLocal[] = selectedDates.sort().map((date) => ({
      date,
      ranges: ranges.map((r, i) => ({ id: `${date}-${i}-${r.start_hour}`, start_hour: r.start_hour, end_hour: r.end_hour })),
    }));
    onApply(overrides);
  }

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: "var(--space-6)",
        width: 440, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
          Date-specific availability
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: "var(--space-5)" }}>
          Select the date(s) you want to assign specific hours.
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, padding: "2px 8px", lineHeight: 1 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{MONTHS_LONG[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, padding: "2px 8px", lineHeight: 1 }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: "var(--space-5)" }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", padding: "3px 0" }}>{w}</div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={`blank-${idx}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isPast = dateStr < todayStr;
            const isToday = dateStr === todayStr;
            const isSelected = selectedDates.includes(dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => toggleDate(dateStr)}
                disabled={isPast}
                style={{
                  width: "100%", aspectRatio: "1", borderRadius: "50%", border: "none",
                  background: isSelected ? "var(--color-primary)" : isToday ? "rgba(74,158,255,0.12)" : "transparent",
                  color: isSelected ? "#fff" : isPast ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
                  cursor: isPast ? "not-allowed" : "pointer",
                  opacity: isPast ? 0.4 : 1,
                  fontFamily: "var(--font-sans)",
                  outline: isToday && !isSelected ? "1px solid rgba(74,158,255,0.5)" : "none",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-4)", marginBottom: "var(--space-5)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-3)" }}>
            What hours are you available?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ranges.map((range) => (
              <div key={range.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <TimePicker
                  value={range.start_hour}
                  onChange={(v) => updateRange(range.id, { start_hour: v })}
                />
                <TimePicker
                  value={range.end_hour}
                  onChange={(v) => updateRange(range.id, { end_hour: v })}
                  minFh={range.start_hour}
                  isEndTime
                />
                {ranges.length > 1 && (
                  <button
                    onClick={() => removeRange(range.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
          {overlapError && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5"/><path d="M8 5v4M8 10.5v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Time ranges overlap — please adjust so they don&apos;t conflict.
            </div>
          )}
          {canAddMore && (
            <button
              onClick={addRange}
              style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-sans)", padding: 0 }}
            >
              + Add time range
            </button>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button
            onClick={handleApply}
            disabled={selectedDates.length === 0 || overlapError}
            style={{ ...primaryBtn, opacity: selectedDates.length === 0 || overlapError ? 0.5 : 1 }}
          >
            Apply {selectedDates.length > 0 ? `(${selectedDates.length} day${selectedDates.length !== 1 ? "s" : ""})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

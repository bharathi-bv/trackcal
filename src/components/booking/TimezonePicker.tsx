"use client";

/**
 * TimezonePicker — full IANA timezone list with search + continent grouping.
 *
 * Each entry shows:  "India Standard Time  UTC+05:30 · 4:51 PM"
 * Trigger button shows the selected timezone's full name + offset + current time.
 *
 * List is built lazily on first open and cached for the session.
 */

import * as React from "react";

type TzEntry = {
  iana: string;
  city: string;       // short city label (e.g. "Kolkata")
  fullName: string;   // long timezone name (e.g. "India Standard Time")
  continent: string;
  offsetMins: number;
  offsetStr: string;  // e.g. "UTC+05:30"
  currentTime: string; // e.g. "4:51 PM" — computed once at list-build time
};

function getOffsetMins(iana: string, ref: Date): number {
  try {
    const utcStr = ref.toLocaleString("en-US", { timeZone: "UTC" });
    const localStr = ref.toLocaleString("en-US", { timeZone: iana });
    return (new Date(localStr).getTime() - new Date(utcStr).getTime()) / 60000;
  } catch {
    return 0;
  }
}

function minsToOffsetStr(mins: number): string {
  const abs = Math.abs(mins);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${mins >= 0 ? "+" : "-"}${h}:${m}`;
}

function getLongName(iana: string, ref: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "long",
    }).formatToParts(ref);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? iana;
  } catch {
    return iana;
  }
}

function getCurrentTime(iana: string, ref: Date): string {
  try {
    return ref.toLocaleTimeString("en-US", {
      timeZone: iana,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

const CONTINENT_ORDER = [
  "America",
  "Europe",
  "Africa",
  "Asia",
  "Australia",
  "Pacific",
  "Atlantic",
  "Indian",
  "Arctic",
  "Antarctica",
  "Etc",
];

let cachedList: TzEntry[] | null = null;

function buildTzList(): TzEntry[] {
  if (cachedList) return cachedList;

  let zones: string[];
  try {
    zones = (
      Intl as unknown as { supportedValuesOf(k: string): string[] }
    ).supportedValuesOf("timeZone");
  } catch {
    zones = [
      "America/Los_Angeles", "America/Denver", "America/Chicago",
      "America/New_York", "America/Sao_Paulo", "Europe/London",
      "Europe/Paris", "Europe/Berlin", "Africa/Cairo", "Asia/Dubai",
      "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo",
      "Australia/Sydney", "Pacific/Auckland", "UTC",
    ];
  }

  const ref = new Date();
  cachedList = zones
    .map((iana) => {
      const parts = iana.split("/");
      const continent = parts.length > 1 ? parts[0] : "Other";
      const city =
        parts.length > 1 ? parts.slice(1).join("/").replace(/_/g, " ") : iana;
      const offsetMins = getOffsetMins(iana, ref);
      return {
        iana,
        city,
        fullName: getLongName(iana, ref),
        continent,
        offsetMins,
        offsetStr: minsToOffsetStr(offsetMins),
        currentTime: getCurrentTime(iana, ref),
      };
    })
    .sort((a, b) => a.offsetMins - b.offsetMins || a.city.localeCompare(b.city));

  return cachedList;
}

export default function TimezonePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iana: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [list, setList] = React.useState<TzEntry[]>([]);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Build list lazily on first open
  React.useEffect(() => {
    if (open && list.length === 0) setList(buildTzList());
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, list.length]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setSearch(""); }
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (t) =>
        t.city.toLowerCase().includes(q) ||
        t.fullName.toLowerCase().includes(q) ||
        t.iana.toLowerCase().includes(q) ||
        t.continent.toLowerCase().includes(q) ||
        t.offsetStr.toLowerCase().includes(q)
    );
  }, [list, search]);

  const grouped = React.useMemo(() => {
    const map: Record<string, TzEntry[]> = {};
    filtered.forEach((t) => { (map[t.continent] ??= []).push(t); });
    const known = CONTINENT_ORDER.filter((c) => map[c]).map((c) => ({
      continent: c,
      zones: map[c],
    }));
    const unknown = Object.keys(map)
      .filter((c) => !CONTINENT_ORDER.includes(c))
      .map((c) => ({ continent: c, zones: map[c] }));
    return [...known, ...unknown];
  }, [filtered]);

  // Resolve selected entry for trigger display (falls back to computing directly from IANA string)
  const selected = React.useMemo(
    () => list.find((t) => t.iana === value),
    [list, value]
  );

  // Compute trigger label directly from IANA string — works even before list is built
  const triggerLabel = React.useMemo(() => {
    if (selected) return `${selected.fullName} · ${selected.offsetStr}`;
    // List not loaded yet — derive directly
    try {
      const now = new Date();
      const fullName = getLongName(value, now);
      const offsetMins = getOffsetMins(value, now);
      const offsetStr = minsToOffsetStr(offsetMins);
      return `${fullName} · ${offsetStr}`;
    } catch {
      return value.split("/").slice(1).join("/").replace(/_/g, " ") || value;
    }
  }, [selected, value]);

  // Compute current time live for the trigger
  const liveTime = React.useMemo(() => {
    try {
      return new Date().toLocaleTimeString("en-US", {
        timeZone: value,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  }, [value]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          background: open ? "var(--surface-subtle)" : "var(--surface-page)",
          cursor: "pointer",
          fontSize: 11,
          color: "var(--text-primary)",
          fontWeight: 500,
          fontFamily: "inherit",
          maxWidth: 280,
          transition: "background 0.1s",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {triggerLabel}
        </span>
        {liveTime && (
          <span style={{ fontSize: 10, color: "var(--text-secondary)", flexShrink: 0 }}>
            {liveTime}
          </span>
        )}
        <span style={{ fontSize: 9, color: "var(--text-tertiary)", flexShrink: 0 }}>▾</span>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,   // align to right edge of trigger
            zIndex: 200,
            width: 360,
            maxHeight: 380,
            background: "var(--surface-page)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--border-default)",
              flexShrink: 0,
            }}
          >
            <input
              ref={searchRef}
              placeholder="Search timezones…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "5px 8px",
                fontSize: 12,
                fontFamily: "inherit",
                outline: "none",
                color: "var(--text-primary)",
                background: "var(--surface-subtle)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Grouped list */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {list.length === 0 ? (
              <div style={{ padding: "24px 14px", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
                Loading timezones…
              </div>
            ) : grouped.length === 0 ? (
              <div style={{ padding: "24px 14px", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center" }}>
                No timezones found
              </div>
            ) : (
              grouped.map(({ continent, zones }) => (
                <div key={continent}>
                  <div
                    style={{
                      padding: "5px 12px 2px",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface-page)",
                      zIndex: 1,
                      borderBottom: "1px solid var(--border-default)",
                    }}
                  >
                    {continent}
                  </div>

                  {zones.map((tz) => {
                    const isActive = tz.iana === value;
                    return (
                      <button
                        key={tz.iana}
                        onClick={() => {
                          onChange(tz.iana);
                          setOpen(false);
                          setSearch("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          padding: "7px 14px",
                          border: "none",
                          background: isActive ? "var(--blue-50)" : "transparent",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          gap: 8,
                        }}
                      >
                        {/* Full timezone name */}
                        <span
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: isActive ? "var(--blue-500)" : "var(--text-primary)",
                            fontWeight: isActive ? 600 : 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tz.fullName}
                        </span>
                        {/* Offset + current time */}
                        <span
                          style={{
                            fontSize: 10,
                            color: isActive ? "var(--blue-400)" : "var(--text-tertiary)",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tz.offsetStr}
                          {tz.currentTime ? ` · ${tz.currentTime}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBookingStore } from "@/store/bookingStore";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CustomQuestion } from "@/lib/event-type-config";

// ── Country codes for phone fields ─────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+1",   name: "US/CA" },
  { code: "+44",  name: "UK" },
  { code: "+91",  name: "India" },
  { code: "+61",  name: "Australia" },
  { code: "+49",  name: "Germany" },
  { code: "+33",  name: "France" },
  { code: "+39",  name: "Italy" },
  { code: "+34",  name: "Spain" },
  { code: "+55",  name: "Brazil" },
  { code: "+52",  name: "Mexico" },
  { code: "+81",  name: "Japan" },
  { code: "+82",  name: "South Korea" },
  { code: "+86",  name: "China" },
  { code: "+65",  name: "Singapore" },
  { code: "+971", name: "UAE" },
  { code: "+966", name: "Saudi Arabia" },
  { code: "+27",  name: "South Africa" },
  { code: "+234", name: "Nigeria" },
  { code: "+254", name: "Kenya" },
  { code: "+7",   name: "Russia" },
  { code: "+380", name: "Ukraine" },
  { code: "+48",  name: "Poland" },
  { code: "+31",  name: "Netherlands" },
  { code: "+46",  name: "Sweden" },
  { code: "+47",  name: "Norway" },
  { code: "+45",  name: "Denmark" },
  { code: "+358", name: "Finland" },
  { code: "+41",  name: "Switzerland" },
  { code: "+43",  name: "Austria" },
  { code: "+32",  name: "Belgium" },
  { code: "+351", name: "Portugal" },
  { code: "+353", name: "Ireland" },
  { code: "+64",  name: "New Zealand" },
  { code: "+62",  name: "Indonesia" },
  { code: "+63",  name: "Philippines" },
  { code: "+66",  name: "Thailand" },
  { code: "+84",  name: "Vietnam" },
  { code: "+60",  name: "Malaysia" },
  { code: "+92",  name: "Pakistan" },
  { code: "+880", name: "Bangladesh" },
  { code: "+94",  name: "Sri Lanka" },
  { code: "+90",  name: "Turkey" },
  { code: "+972", name: "Israel" },
  { code: "+20",  name: "Egypt" },
];

// ── Searchable single-select dropdown ──────────────────────────────────────
function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  allowOther,
  required,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowOther?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [otherText, setOtherText] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const isOther = value === "__other__";

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const displayValue = isOther ? (otherText || "Other") : value;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="tc-input"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <span style={{ color: value ? "inherit" : "var(--text-tertiary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value ? displayValue : placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--surface-page)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 50,
          overflow: "hidden",
        }}>
          {options.length > 6 && (
            <div style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border-subtle)" }}>
              <input
                autoFocus
                className="tc-input"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "4px 8px", fontSize: 12 }}
              />
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: 13,
                  color: value === opt ? "var(--color-primary)" : "var(--text-primary)",
                  background: value === opt ? "var(--color-primary-light)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: value === opt ? 600 : 400,
                }}
              >
                {opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ padding: "var(--space-3)", fontSize: 12, color: "var(--text-tertiary)", margin: 0, textAlign: "center" }}>No matches</p>
            )}
            {allowOther && (
              <button
                type="button"
                onClick={() => { onChange("__other__"); setOpen(false); setSearch(""); }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: 13,
                  color: isOther ? "var(--color-primary)" : "var(--text-secondary)",
                  background: isOther ? "var(--color-primary-light)" : "transparent",
                  border: "none",
                  borderTop: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  fontStyle: "italic",
                  fontWeight: isOther ? 600 : 400,
                }}
              >
                Other…
              </button>
            )}
          </div>
        </div>
      )}

      {isOther && (
        <input
          className="tc-input"
          style={{ marginTop: "var(--space-2)" }}
          placeholder="Please specify…"
          value={otherText}
          required={required}
          onChange={(e) => {
            setOtherText(e.target.value);
            onChange("__other__");
          }}
          onBlur={() => {
            if (otherText.trim()) onChange(`__other__:${otherText.trim()}`);
          }}
        />
      )}
    </div>
  );
}

// ── Multi-select dropdown ───────────────────────────────────────────────────
function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select options",
  allowOther,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  allowOther?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [otherText, setOtherText] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const hasOther = value.includes("__other__");

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  }

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const regularSelected = value.filter((v) => v !== "__other__" && !v.startsWith("__other__:"));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="tc-input"
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          minHeight: 36,
        }}
      >
        <span style={{ color: value.length === 0 ? "var(--text-tertiary)" : "var(--text-primary)", fontSize: 13 }}>
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {regularSelected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "var(--space-2)" }}>
          {regularSelected.map((v) => (
            <span
              key={v}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-primary-light)",
                border: "1px solid var(--color-primary-border)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-primary)",
              }}
            >
              {v}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggle(v); }}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1, color: "var(--color-primary)", fontSize: 14 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--surface-page)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 50,
          overflow: "hidden",
        }}>
          {options.length > 6 && (
            <div style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--border-subtle)" }}>
              <input
                autoFocus
                className="tc-input"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "4px 8px", fontSize: 12 }}
              />
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.map((opt) => {
              const checked = value.includes(opt);
              return (
                <label
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: 13,
                    cursor: "pointer",
                    background: checked ? "var(--color-primary-light)" : "transparent",
                    color: checked ? "var(--color-primary)" : "var(--text-primary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    style={{ accentColor: "var(--color-primary)", flexShrink: 0 }}
                  />
                  {opt}
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ padding: "var(--space-3)", fontSize: 12, color: "var(--text-tertiary)", margin: 0, textAlign: "center" }}>No matches</p>
            )}
            {allowOther && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: 13,
                  cursor: "pointer",
                  fontStyle: "italic",
                  borderTop: "1px solid var(--border-subtle)",
                  background: hasOther ? "var(--color-primary-light)" : "transparent",
                  color: hasOther ? "var(--color-primary)" : "var(--text-secondary)",
                }}
              >
                <input
                  type="checkbox"
                  checked={hasOther}
                  onChange={() => toggle("__other__")}
                  style={{ accentColor: "var(--color-primary)", flexShrink: 0 }}
                />
                Other…
              </label>
            )}
          </div>
        </div>
      )}

      {hasOther && (
        <input
          className="tc-input"
          style={{ marginTop: "var(--space-2)" }}
          placeholder="Please specify…"
          value={otherText}
          onChange={(e) => {
            setOtherText(e.target.value);
          }}
          onBlur={() => {
            if (otherText.trim()) {
              const next = value.filter((v) => v !== "__other__" && !v.startsWith("__other__:"));
              onChange([...next, `__other__:${otherText.trim()}`]);
            }
          }}
        />
      )}
    </div>
  );
}

// ── Phone field with country code ──────────────────────────────────────────
function PhoneField({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [cc, setCc] = React.useState("+1");
  const [num, setNum] = React.useState("");

  // Parse stored value on mount
  React.useEffect(() => {
    if (!value) return;
    const match = value.match(/^(\+\d+)\s(.+)$/);
    if (match) { setCc(match[1]); setNum(match[2]); }
    else setNum(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(newCc: string, newNum: string) {
    onChange(newNum.trim() ? `${newCc} ${newNum.trim()}` : "");
  }

  return (
    <div style={{ display: "flex", gap: "var(--space-2)" }}>
      <div className="tc-select-wrap" style={{ flexShrink: 0, width: 110 }}>
        <select
          className="tc-input"
          value={cc}
          onChange={(e) => { setCc(e.target.value); update(e.target.value, num); }}
          style={{ paddingRight: 28 }}
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.name}
            </option>
          ))}
        </select>
      </div>
      <input
        className="tc-input"
        type="tel"
        placeholder={placeholder ?? "Phone number"}
        value={num}
        required={required}
        onChange={(e) => { setNum(e.target.value); update(cc, e.target.value); }}
        style={{ flex: 1 }}
      />
    </div>
  );
}

// ── Main form schema ────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  website: z.string().max(200).optional(),
});
type Values = z.infer<typeof schema>;

// ── DetailsForm ─────────────────────────────────────────────────────────────
export default function DetailsForm({ questions = [] }: { questions?: CustomQuestion[] }) {
  const { details, setDetails, customAnswers, setCustomAnswer } = useBookingStore();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: details.name || "",
      email: details.email || "",
      website: "",
    },
    mode: "onTouched",
  });

  // Auto-save name/email to store
  const values = form.watch();
  React.useEffect(() => {
    setDetails({ name: values.name ?? "", email: values.email ?? "" });
  }, [values.name, values.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderQuestion(q: CustomQuestion) {
    const answer = customAnswers[q.id];

    if (q.type === "short_text") {
      return (
        <input
          className="tc-input"
          placeholder={q.placeholder ?? "Your answer"}
          required={q.required}
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => setCustomAnswer(q.id, e.target.value)}
        />
      );
    }
    if (q.type === "long_text") {
      return (
        <textarea
          className="tc-input tc-textarea"
          placeholder={q.placeholder ?? "Your answer"}
          required={q.required}
          rows={3}
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => setCustomAnswer(q.id, e.target.value)}
        />
      );
    }
    if (q.type === "phone") {
      return (
        <PhoneField
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => setCustomAnswer(q.id, v)}
          placeholder={q.placeholder}
          required={q.required}
        />
      );
    }
    if (q.type === "select") {
      return (
        <SelectDropdown
          options={q.options ?? []}
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => setCustomAnswer(q.id, v)}
          placeholder={q.placeholder ?? "Select an option"}
          allowOther={q.allow_other}
          required={q.required}
        />
      );
    }
    if (q.type === "multi_select") {
      return (
        <MultiSelectDropdown
          options={q.options ?? []}
          value={Array.isArray(answer) ? answer : []}
          onChange={(v) => setCustomAnswer(q.id, v)}
          placeholder={q.placeholder ?? "Select options"}
          allowOther={q.allow_other}
        />
      );
    }
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Your details
        </h3>
        <p style={{ marginTop: "var(--space-1)", fontSize: 13, color: "var(--text-secondary)" }}>
          This is what we&apos;ll use to confirm the booking.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        >
          {/* Name — always required */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <input className="tc-input" placeholder="Your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email — always required */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address *</FormLabel>
                <FormControl>
                  <input className="tc-input" type="email" placeholder="you@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Custom questions */}
          {questions.map((q) => (
            <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                {q.label}
                {q.required && <span style={{ color: "var(--color-danger, #ef4444)", marginLeft: 3 }}>*</span>}
              </label>
              {renderQuestion(q)}
            </div>
          ))}

          {/* Honeypot */}
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem
                style={{
                  position: "absolute",
                  left: "-10000px",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  opacity: 0,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <input {...field} tabIndex={-1} autoComplete="off" inputMode="text" />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}

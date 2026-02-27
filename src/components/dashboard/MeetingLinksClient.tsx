"use client";

import { useState } from "react";

type EventType = {
  id: string;
  name: string;
  slug: string;
  duration: number;
};

export default function MeetingLinksClient({
  eventTypes,
  baseUrl,
}: {
  eventTypes: EventType[];
  baseUrl: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(slug: string, id: string) {
    const url = `${baseUrl}/book?event=${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (eventTypes.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
        No active event types. <a href="/app/dashboard/event-types" style={{ color: "var(--blue-400)" }}>Create one →</a>
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {eventTypes.map((et) => {
        const url = `${baseUrl}/book?event=${et.slug}`;
        const copied = copiedId === et.id;
        return (
          <div
            key={et.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--surface-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
              <span className="badge badge-blue" style={{ flexShrink: 0 }}>
                {et.duration}m
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {et.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {url}
              </span>
            </div>
            <button
              className={`btn btn-sm ${copied ? "btn-secondary" : "btn-ghost"}`}
              style={{ flexShrink: 0, minWidth: 72 }}
              onClick={() => handleCopy(et.slug, et.id)}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

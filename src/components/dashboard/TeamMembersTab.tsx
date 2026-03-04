"use client";

import * as React from "react";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  is_active: boolean;
  google_refresh_token: string | null;
  microsoft_refresh_token?: string | null;
  last_booking_at: string | null;
  created_at: string;
};

function MemberAvatar({ member, size = 36 }: { member: TeamMember; size?: number }) {
  const [imgError, setImgError] = React.useState(false);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: member.photo_url && !imgError ? "var(--surface-subtle)" : "var(--blue-400)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 800,
        color: "white",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {member.photo_url && !imgError ? (
        <img
          src={member.photo_url}
          alt={member.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgError(true)}
        />
      ) : (
        member.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function TeamMembersTab({
  initialMembers,
}: {
  initialMembers: TeamMember[];
}) {
  const [members, setMembers] = React.useState<TeamMember[]>(initialMembers);
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = React.useState<string | null>(null);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      setMembers((prev) => [...prev, data.member]);
      setNewName("");
      setNewEmail("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(member: TeamMember) {
    try {
      const res = await fetch(`/api/team-members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? data.member : m)));
    } catch (err) {
      console.error("Toggle active failed:", err);
    }
  }

  async function handleDelete(memberId: string) {
    if (!confirm("Remove this team member? Existing bookings will keep the record.")) return;
    try {
      const res = await fetch(`/api/team-members/${memberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleDisconnectCalendar(member: TeamMember) {
    const providerLabel = member.microsoft_refresh_token ? "Outlook Calendar" : "Google Calendar";
    if (!confirm(`Disconnect ${member.name}'s ${providerLabel}?`)) return;
    setDisconnectingId(member.id);
    try {
      const res = await fetch(`/api/team-members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect_calendar: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? data.member : m)));
    } catch (err) {
      console.error("Disconnect calendar failed:", err);
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          Team Members
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "var(--space-1) 0 0" }}>
          Add team members and assign them to event types for round-robin scheduling.
          An invite email is sent automatically — they sign up and connect their own Google Calendar.
        </p>
      </div>

      {/* Member list */}
      {members.length > 0 && (
        <div
          className="tc-card"
          style={{ padding: 0, overflow: "hidden" }}
        >
          {members.map((member, idx) => (
            <div
              key={member.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-4) var(--space-5)",
                borderBottom: idx < members.length - 1 ? "1px solid var(--border-default)" : "none",
              }}
            >
              {/* Avatar */}
              <MemberAvatar member={member} size={36} />

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {member.name}
                  </span>
                  {/* Calendar status badge */}
                  {member.google_refresh_token || member.microsoft_refresh_token ? (
                    <span className="tc-pill tc-pill--success" style={{ fontSize: 10 }}>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "var(--success)",
                          flexShrink: 0,
                        }}
                      />
                      Calendar connected
                    </span>
                  ) : (
                    <span className="tc-pill tc-pill--warning" style={{ fontSize: 10 }}>
                      Calendar not connected
                    </span>
                  )}
                  {!member.is_active && (
                    <span className="tc-pill tc-pill--neutral" style={{ fontSize: 10 }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                  {member.email}
                  {member.last_booking_at && (
                    <span style={{ marginLeft: "var(--space-2)" }}>
                      · Last booked {new Date(member.last_booking_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
                {/* Disconnect Calendar — only shown when connected */}
                {(member.google_refresh_token || member.microsoft_refresh_token) && (
                  <button
                    className="tc-btn tc-btn--ghost tc-btn--sm"
                    onClick={() => handleDisconnectCalendar(member)}
                    disabled={disconnectingId === member.id}
                    title="Disconnect this member's calendar"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {disconnectingId === member.id ? "Disconnecting…" : "Disconnect calendar"}
                  </button>
                )}

                {/* Active toggle */}
                <button
                  className="tc-btn tc-btn--ghost tc-btn--sm"
                  onClick={() => handleToggleActive(member)}
                  title={member.is_active ? "Deactivate member" : "Activate member"}
                  style={{ color: member.is_active ? "var(--text-tertiary)" : "var(--success)" }}
                >
                  {member.is_active ? "Deactivate" : "Activate"}
                </button>

                {/* Delete */}
                <button
                  className="tc-btn tc-btn--ghost tc-btn--sm"
                  onClick={() => handleDelete(member.id)}
                  title="Remove team member"
                  style={{ color: "var(--error)" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && (
        <div
          className="alert alert-info"
          style={{ fontSize: 13 }}
        >
          No team members yet. Add your first member below.
        </div>
      )}

      {/* How it works info box */}
      <div
        style={{
          background: "var(--blue-50)",
          border: "1px solid rgba(74,158,255,0.25)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          fontSize: 13,
          color: "var(--text-secondary)",
        }}
      >
        <strong style={{ color: "var(--text-primary)" }}>How team member calendars work:</strong>
        <ol style={{ margin: "var(--space-2) 0 0", paddingLeft: "var(--space-5)", lineHeight: 1.7 }}>
          <li>Add the member below — a CitaCal invite is emailed to them automatically.</li>
          <li>They click the link, create their account, and land on their own settings page.</li>
          <li>They connect their Google Calendar themselves — no link-sharing needed.</li>
          <li>The badge on their card changes to <strong>Calendar connected</strong> once they do.</li>
        </ol>
      </div>

      {/* Add member form */}
      <div className="tc-card" style={{ padding: "var(--space-5)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 var(--space-4)" }}>
          Add team member
        </h3>
        <form onSubmit={handleAddMember}>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <div className="tc-form-field" style={{ flex: 1, minWidth: 160 }}>
              <label className="tc-form-label">Name</label>
              <input
                className="tc-input"
                type="text"
                placeholder="Sarah Chen"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="tc-form-field" style={{ flex: 1, minWidth: 200 }}>
              <label className="tc-form-label">Email</label>
              <input
                className="tc-input"
                type="email"
                placeholder="sarah@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="submit"
                className="tc-btn tc-btn--primary tc-btn--sm"
                disabled={adding || !newName.trim() || !newEmail.trim()}
              >
                {adding ? "Adding…" : "Add member"}
              </button>
            </div>
          </div>
          {addError && (
            <p style={{ fontSize: 12, color: "var(--error)", marginTop: "var(--space-2)" }}>
              {addError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ height: 56, background: "rgba(255,255,255,0.75)", borderBottom: "1px solid rgba(200,198,230,0.35)" }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div className="skeleton" style={{ height: 28, width: 140, borderRadius: 8, marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );
}

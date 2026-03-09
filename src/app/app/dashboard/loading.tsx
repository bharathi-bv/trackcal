export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 24px" }}>
        {/* Page title */}
        <div className="skeleton" style={{ height: 28, width: 200, borderRadius: 8, marginBottom: 24 }} />
        {/* Cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
        </div>
        {/* Table */}
        <div className="skeleton" style={{ height: 400, borderRadius: 14 }} />
      </div>
    </div>
  );
}

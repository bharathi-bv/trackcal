export default function EventTypesLoading() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ height: 56, background: "rgba(255,255,255,0.75)", borderBottom: "1px solid rgba(200,198,230,0.35)" }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div className="skeleton" style={{ height: 28, width: 180, borderRadius: 8, marginBottom: 24 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 14 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

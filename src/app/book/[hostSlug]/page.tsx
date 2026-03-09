import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";

export default async function BookingHomePage({
  params,
}: {
  params: Promise<{ hostSlug: string }>;
}) {
  const { hostSlug } = await params;
  const db = createServerClient();

  const [hostResult, eventTypesResult] = await Promise.all([
    db
      .from("host_settings")
      .select("host_name, public_slug, profile_photo_url")
      .eq("public_slug", hostSlug)
      .limit(1)
      .maybeSingle(),
    db
      .from("event_types")
      .select("id, name, slug, duration, description")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  if (!hostResult.data) {
    notFound();
  }

  const host = hostResult.data;
  const eventTypes = eventTypesResult.data ?? [];
  const displayName = host.host_name || hostSlug;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Host header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {host.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={host.profile_photo_url}
              alt={displayName}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                objectFit: "cover",
                margin: "0 auto 12px",
                display: "block",
                border: "3px solid rgba(255,255,255,0.8)",
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#E5E7EB",
                margin: "0 auto 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="4" fill="#9CA3AF" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#9CA3AF" />
              </svg>
            </div>
          )}
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#171717",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            Book time with {displayName}
          </h1>
          <p style={{ fontSize: 14, color: "#525252", margin: 0 }}>
            Pick a meeting type below to see available times.
          </p>
        </div>

        {/* Booking links */}
        {eventTypes.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.85)",
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            No booking types are available right now.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {eventTypes.map((et) => (
              <Link
                key={et.id}
                href={`/book/${hostSlug}/${et.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(8px)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    border: "1px solid rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    transition: "background 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.95)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.85)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#171717",
                        marginBottom: et.description ? 4 : 0,
                      }}
                    >
                      {et.name}
                    </div>
                    {et.description && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#6B7280",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {et.description}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#4B5563",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {et.duration} min
                    </span>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
                      <path
                        d="M7 5l5 5-5 5"
                        stroke="#9CA3AF"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 12,
            color: "rgba(82,82,82,0.6)",
          }}
        >
          Powered by <strong style={{ fontWeight: 700 }}>CitaCal</strong>
        </p>
      </div>
    </main>
  );
}

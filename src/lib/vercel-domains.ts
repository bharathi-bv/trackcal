/**
 * vercel-domains.ts
 *
 * Programmatically add/remove custom domains on this Vercel project via the
 * Vercel REST API. Called automatically when a user saves or clears their
 * custom booking base URL in settings.
 *
 * Required env vars (set in Vercel dashboard + .env.local):
 *   VERCEL_API_TOKEN  — Personal access token from vercel.com/account/tokens
 *   VERCEL_PROJECT_ID — Project ID from your project's Settings page
 *                       (auto-injected by Vercel in deployed environments)
 *
 * Both functions soft-fail — they log errors but never throw, so they never
 * block the user from saving settings.
 */

const VERCEL_API = "https://api.vercel.com";

function getConfig(): { token: string; projectId: string; configured: true } | { configured: false } {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && projectId) return { token, projectId, configured: true };
  return { configured: false };
}

export type VercelDomainAddResult = {
  ok: boolean;
  /** DNS record type the user must add in their registrar */
  recordType?: "CNAME" | "A";
  /** DNS target value (e.g. "cname.vercel-dns.com" or "76.76.21.21") */
  dnsTarget?: string;
  error?: string;
};

/**
 * Register a hostname with this Vercel project so Vercel will serve traffic
 * for it and provision a TLS certificate.
 *
 * For subdomains (book.example.com): CNAME → cname.vercel-dns.com
 * For apex domains (example.com):    A     → 76.76.21.21
 */
export async function addDomainToVercel(hostname: string): Promise<VercelDomainAddResult> {
  const config = getConfig();
  if (!config.configured) {
    // Dev environment without Vercel tokens — skip silently
    console.info("[vercel-domains] VERCEL_API_TOKEN / VERCEL_PROJECT_ID not set — skipping addDomain");
    return { ok: true };
  }

  try {
    const res = await fetch(`${VERCEL_API}/v10/projects/${config.projectId}/domains`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: hostname }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
      name?: string;
    };

    if (!res.ok) {
      const code = data.error?.code ?? "";
      // Already registered to this project — treat as success
      if (code === "domain_already_exists" || code === "domain_already_in_use") {
        return { ok: true, ...dnsRecord(hostname) };
      }
      return { ok: false, error: data.error?.message ?? `Vercel API error ${res.status}` };
    }

    return { ok: true, ...dnsRecord(hostname) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network_error";
    console.error("[vercel-domains] addDomain error:", message);
    return { ok: false, error: message };
  }
}

/**
 * Remove a hostname from this Vercel project (called when user clears their
 * custom domain in settings).
 */
export async function removeDomainFromVercel(hostname: string): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config.configured) return { ok: true };

  try {
    const res = await fetch(
      `${VERCEL_API}/v9/projects/${config.projectId}/domains/${encodeURIComponent(hostname)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${config.token}` },
      }
    );

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
      if (data.error?.code === "domain_not_found") return { ok: true }; // Already gone
      return { ok: false, error: data.error?.message ?? `Vercel API error ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network_error";
    console.error("[vercel-domains] removeDomain error:", message);
    return { ok: false, error: message };
  }
}

/** Returns the DNS record the user needs to add based on whether it's a subdomain or apex. */
function dnsRecord(hostname: string): { recordType: "CNAME" | "A"; dnsTarget: string } {
  // Apex domain has no dots before the TLD (e.g. "example.com" has parts.length === 2)
  const parts = hostname.split(".");
  const isApex = parts.length <= 2;
  return isApex
    ? { recordType: "A", dnsTarget: "76.76.21.21" }
    : { recordType: "CNAME", dnsTarget: "cname.vercel-dns.com" };
}

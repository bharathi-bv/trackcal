/**
 * attribution.ts
 *
 * Captures UTM parameters and ad platform click IDs from the URL,
 * persists them in localStorage with a 30-day expiry, and returns them.
 *
 * Why this matters: Calendly drops all click IDs in its iframe. CitaCal
 * captures them server-side at the booking moment so ad platforms get
 * accurate conversion data.
 */

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  parent_page_url?: string;   // Parent page URL for embedded booking flows
  parent_page_slug?: string;  // Derived last path segment from parent page
  gclid?: string;      // Google Ads click ID
  gbraid?: string;     // Google Ads iOS click ID
  wbraid?: string;     // Google Ads web-to-app click ID
  li_fat_id?: string;  // LinkedIn click ID
  fbclid?: string;     // Meta / Facebook click ID
  fbc?: string;        // Meta click ID cookie
  fbp?: string;        // Meta browser ID cookie
  ttclid?: string;     // TikTok click ID
  msclkid?: string;    // Microsoft Ads click ID
  ga_linker?: string;  // GA cross-domain linker value (_gl)
};

// All URL params we care about
const TRACKED_KEYS: (keyof UtmParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "parent_page_url",
  "parent_page_slug",
  "gclid",
  "gbraid",
  "wbraid",
  "li_fat_id",
  "fbclid",
  "fbc",
  "fbp",
  "ttclid",
  "msclkid",
  "ga_linker",
];

const STORAGE_KEY = "citacal_utm";
const EXPIRY_DAYS = 30;

type StoredEntry = {
  params: UtmParams;
  expiry: number; // Unix timestamp (ms)
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * Reads UTM/click-ID params from the current URL.
 * If any are found → saves to localStorage (30-day expiry) and returns them.
 * If none found → checks localStorage for a still-valid prior visit.
 * Returns empty object if nothing found anywhere.
 */
export function captureUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  const url = new URL(window.location.href);
  const fromUrl: UtmParams = {};

  for (const key of TRACKED_KEYS) {
    const paramKey = key === "ga_linker" ? "_gl" : key;
    const val = url.searchParams.get(paramKey);
    if (val) fromUrl[key] = val;
  }

  // Recover Meta identifiers from first-party cookies when URL params are absent.
  if (!fromUrl.fbc) {
    const cookieFbc = readCookie("_fbc");
    if (cookieFbc) fromUrl.fbc = cookieFbc;
  }
  if (!fromUrl.fbp) {
    const cookieFbp = readCookie("_fbp");
    if (cookieFbp) fromUrl.fbp = cookieFbp;
  }

  // If the current URL has any tracked params, save and return them
  if (Object.keys(fromUrl).length > 0) {
    const entry: StoredEntry = {
      params: fromUrl,
      expiry: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // localStorage unavailable (private mode, storage full) — gracefully continue
    }
    return fromUrl;
  }

  // No URL params — try to recover from a previous visit
  return getStoredUtmParams();
}

/**
 * Reads UTM params from localStorage.
 * Returns empty object if nothing stored or entry has expired.
 */
export function getStoredUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const entry: StoredEntry = JSON.parse(raw);
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }

    return entry.params;
  } catch {
    return {};
  }
}

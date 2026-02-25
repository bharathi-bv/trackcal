/**
 * attribution.ts
 *
 * Captures UTM parameters and ad platform click IDs from the URL,
 * persists them in localStorage with a 30-day expiry, and returns them.
 *
 * Why this matters: Calendly drops all click IDs in its iframe. TrackCal
 * captures them server-side at the booking moment so ad platforms get
 * accurate conversion data.
 */

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;      // Google Ads click ID
  li_fat_id?: string;  // LinkedIn click ID
  fbclid?: string;     // Meta / Facebook click ID
  ttclid?: string;     // TikTok click ID
  msclkid?: string;    // Microsoft Ads click ID
};

// All URL params we care about
const TRACKED_KEYS: (keyof UtmParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "li_fat_id",
  "fbclid",
  "ttclid",
  "msclkid",
];

const STORAGE_KEY = "trackcal_utm";
const EXPIRY_DAYS = 30;

type StoredEntry = {
  params: UtmParams;
  expiry: number; // Unix timestamp (ms)
};

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
    const val = url.searchParams.get(key);
    if (val) fromUrl[key] = val;
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

import { createHash, randomBytes } from "crypto";

const DEFAULT_MANAGE_TOKEN_TTL_DAYS = 365;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_LABEL_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function hashManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createManageToken() {
  const token = randomBytes(24).toString("base64url");
  const now = Date.now();
  const ttlDays = envNumber("CITACAL_MANAGE_TOKEN_TTL_DAYS", DEFAULT_MANAGE_TOKEN_TTL_DAYS);
  const expiresAt = new Date(now + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  return {
    token,
    hash: hashManageToken(token),
    expiresAt,
  };
}

export type BookingActionUrls = {
  manage: string;
  reschedule: string;
  cancel: string;
};

export function buildBookingActionUrls(baseUrl: string, token: string): BookingActionUrls {
  const root = baseUrl.replace(/\/+$/, "");
  const encoded = encodeURIComponent(token);
  return {
    manage: `${root}/manage/${encoded}`,
    reschedule: `${root}/reschedule/${encoded}`,
    cancel: `${root}/manage/${encoded}`,
  };
}

export function appendBookingActionLinks(
  description: string,
  actionUrls?: BookingActionUrls | null
) {
  const base = description.trim();
  if (!actionUrls) return base;
  const links = [
    "Booking actions:",
    `Reschedule: ${actionUrls.reschedule}`,
    `Cancel: ${actionUrls.cancel}`,
  ].join("\n");
  return [base, links].filter(Boolean).join("\n\n");
}

export function resolvePublicBaseUrl(args: {
  headers: Headers;
  configuredBaseUrl?: string | null;
}) {
  const configured = args.configuredBaseUrl?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const host = args.headers.get("x-forwarded-host") ?? args.headers.get("host");
  const protoFromHeader = args.headers.get("x-forwarded-proto");
  const proto = protoFromHeader || (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "https://citacal.com";
}

export function parseTimeLabelToMinutes(label: string): number | null {
  const m = label.trim().match(TIME_LABEL_RE);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const period = m[3].toUpperCase();
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 1 || hh > 12 || mm < 0 || mm > 59) {
    return null;
  }
  const hour24 = (hh % 12) + (period === "PM" ? 12 : 0);
  return hour24 * 60 + mm;
}

export function isIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && ISO_DATE_RE.test(value));
}

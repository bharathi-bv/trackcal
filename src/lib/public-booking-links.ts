import { createServerClient } from "@/lib/supabase";

export function slugifyPublicSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function shouldUseBookPathPrefix(baseUrl: string) {
  const normalized = baseUrl.trim();
  if (!normalized) return true;

  try {
    const hostname = new URL(normalized).hostname.toLowerCase();
    return (
      hostname === "citacal.com" ||
      hostname.endsWith(".citacal.com") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return normalized.includes("citacal.com");
  }
}

export function buildPublicBookingPath(
  hostSlug: string,
  eventSlug: string,
  withBookPrefix = true
) {
  return withBookPrefix ? `/book/${hostSlug}/${eventSlug}` : `/${hostSlug}/${eventSlug}`;
}

export function buildPublicBookingUrl(baseUrl: string, hostSlug: string, eventSlug: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const withBookPrefix = shouldUseBookPathPrefix(normalizedBase);
  return `${normalizedBase}${buildPublicBookingPath(hostSlug, eventSlug, withBookPrefix)}`;
}

function deriveHostSlugSeed({
  hostName,
  email,
}: {
  hostName?: string | null;
  email?: string | null;
}) {
  const emailLocalPart = email?.split("@")[0] ?? "";
  return slugifyPublicSegment(hostName || emailLocalPart || "citacal");
}

async function findAvailableHostSlug({
  db,
  baseSlug,
  currentId,
}: {
  db: ReturnType<typeof createServerClient>;
  baseSlug: string;
  currentId?: string | null;
}) {
  const normalizedBase = slugifyPublicSegment(baseSlug) || "citacal";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;
    const { data: conflict } = await db
      .from("host_settings")
      .select("id")
      .eq("public_slug", candidate)
      .maybeSingle();

    if (!conflict || conflict.id === currentId) {
      return candidate;
    }
  }

  return `${normalizedBase}-${Date.now().toString().slice(-6)}`;
}

export async function ensureHostPublicSlug({
  db = createServerClient(),
  hostName,
  email,
}: {
  db?: ReturnType<typeof createServerClient>;
  hostName?: string | null;
  email?: string | null;
}) {
  const { data: existing } = await db
    .from("host_settings")
    .select("id, host_name, public_slug")
    .limit(1)
    .maybeSingle();

  if (existing?.public_slug?.trim()) {
    return existing.public_slug.trim();
  }

  const seed = deriveHostSlugSeed({
    hostName: existing?.host_name ?? hostName,
    email,
  });
  const nextSlug = await findAvailableHostSlug({
    db,
    baseSlug: seed,
    currentId: existing?.id ?? null,
  });

  if (existing?.id) {
    await db.from("host_settings").update({ public_slug: nextSlug }).eq("id", existing.id);
    return nextSlug;
  }

  await db.from("host_settings").insert({
    host_name: hostName ?? null,
    public_slug: nextSlug,
  });
  return nextSlug;
}

export async function isHostPublicSlugAvailable({
  slug,
  db = createServerClient(),
}: {
  slug: string;
  db?: ReturnType<typeof createServerClient>;
}) {
  const normalized = slugifyPublicSegment(slug);
  if (!normalized) {
    return {
      normalized: "",
      available: false,
      reason: "invalid",
    } as const;
  }

  const [{ data: current }, { data: conflict }] = await Promise.all([
    db.from("host_settings").select("id, public_slug").limit(1).maybeSingle(),
    db.from("host_settings").select("id, public_slug").eq("public_slug", normalized).maybeSingle(),
  ]);

  if (!conflict) {
    return {
      normalized,
      available: true,
      reason: null,
    } as const;
  }

  if (current?.id && conflict.id === current.id) {
    return {
      normalized,
      available: true,
      reason: "current",
    } as const;
  }

  return {
    normalized,
    available: false,
    reason: "taken",
  } as const;
}

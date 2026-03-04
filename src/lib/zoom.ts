import { createServerClient } from "./supabase";

const ZOOM_API_BASE = "https://api.zoom.us/v2";
const TOKEN_REFRESH_LEEWAY_MS = 60_000;

async function getZoomRow() {
  const db = createServerClient();
  const { data } = await db
    .from("host_settings")
    .select("zoom_access_token, zoom_refresh_token, zoom_token_expiry, zoom_user_id")
    .limit(1)
    .maybeSingle();
  return data;
}

async function saveZoomTokens(tokens: {
  access_token: string;
  refresh_token?: string | null;
  expiry: string;
  user_id?: string | null;
}) {
  const db = createServerClient();
  const { data: existing } = await db.from("host_settings").select("id").limit(1).maybeSingle();

  const payload: Record<string, string | null> = {
    zoom_access_token: tokens.access_token,
    zoom_token_expiry: tokens.expiry,
  };
  if (tokens.refresh_token) payload.zoom_refresh_token = tokens.refresh_token;
  if (tokens.user_id) payload.zoom_user_id = tokens.user_id;

  if (existing) {
    await db.from("host_settings").update(payload).eq("id", existing.id);
  } else {
    await db.from("host_settings").insert(payload);
  }
}

async function exchangeZoomToken(params: Record<string, string>) {
  const creds = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Zoom token exchange failed");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expiry: String(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}

export function getZoomAuthUrl() {
  const url = new URL("https://zoom.us/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.ZOOM_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.ZOOM_REDIRECT_URI!);
  return url.toString();
}

export async function exchangeZoomCodeAndSave(code: string) {
  const tokens = await exchangeZoomToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.ZOOM_REDIRECT_URI!,
  });

  // Get Zoom user ID
  const userRes = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = (await userRes.json().catch(() => ({}))) as { id?: string };

  await saveZoomTokens({ ...tokens, user_id: user.id ?? null });
}

export async function isZoomConnected(): Promise<boolean> {
  const row = await getZoomRow();
  return Boolean(row?.zoom_refresh_token);
}

async function getValidZoomAccessToken(): Promise<string> {
  const row = await getZoomRow();
  if (!row?.zoom_refresh_token) throw new Error("Zoom not connected");

  const expiryMs = row.zoom_token_expiry ? Number(row.zoom_token_expiry) : 0;
  if (row.zoom_access_token && expiryMs > Date.now() + TOKEN_REFRESH_LEEWAY_MS) {
    return row.zoom_access_token;
  }

  // Refresh
  const tokens = await exchangeZoomToken({
    grant_type: "refresh_token",
    refresh_token: row.zoom_refresh_token,
  });
  await saveZoomTokens({ ...tokens, user_id: row.zoom_user_id ?? null });
  return tokens.access_token;
}

export async function createZoomMeeting({
  topic,
  start_time,
  duration,
}: {
  topic: string;
  start_time: string; // ISO string
  duration: number; // minutes
}): Promise<{ id: string; join_url: string }> {
  const token = await getValidZoomAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2, // Scheduled meeting
      start_time,
      duration,
      settings: {
        join_before_host: true,
        waiting_room: false,
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: number | string;
    join_url?: string;
    message?: string;
  };

  if (!res.ok || !data.join_url) {
    throw new Error(data.message || "Failed to create Zoom meeting");
  }

  return { id: String(data.id), join_url: data.join_url };
}

export async function updateZoomMeeting({
  meetingId,
  topic,
  start_time,
  duration,
}: {
  meetingId: string;
  topic?: string;
  start_time: string;
  duration: number;
}): Promise<void> {
  const token = await getValidZoomAccessToken();

  const res = await fetch(`${ZOOM_API_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(topic ? { topic } : {}),
      start_time,
      duration,
      type: 2,
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `Failed to update Zoom meeting (${res.status})`);
  }
}

export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  try {
    const token = await getValidZoomAccessToken();
    const res = await fetch(`${ZOOM_API_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) {
      console.error(`[zoom] deleteZoomMeeting failed: ${res.status}`);
    }
  } catch (err) {
    console.error("[zoom] deleteZoomMeeting error:", err);
  }
}

import { createHmac, randomUUID } from "crypto";

export type BookingWebhookPayload = {
  event: "booking.confirmed";
  occurred_at: string;
  booking: {
    id: string;
    manage_url?: string | null;
    reschedule_url?: string | null;
    cancel_url?: string | null;
    event_slug: string | null;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string | null;
    notes: string | null;
    status: string;
    assigned_to: string | null;
    assigned_host_ids?: string[];
    custom_answers: Record<string, string | string[]> | null;
  };
  assigned_member: { name: string; photo_url: string | null } | null;
  assigned_hosts?: Array<{ id: string; name: string; photo_url: string | null }>;
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
  click_ids: {
    gclid: string | null;
    fbclid: string | null;
    li_fat_id: string | null;
    ttclid: string | null;
    msclkid: string | null;
  };
};

function sign(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

function uniqUrls(urls: string[]) {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}

export async function sendBookingConfirmedWebhooks({
  urls,
  payload,
  secret,
}: {
  urls: string[];
  payload: BookingWebhookPayload;
  secret?: string | null;
}) {
  const targets = uniqUrls(urls);
  if (targets.length === 0) return;

  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));

  await Promise.allSettled(
    targets.map(async (url) => {
      const deliveryId = randomUUID();
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-citacal-event": payload.event,
        "x-citacal-delivery-id": deliveryId,
        "x-citacal-timestamp": timestamp,
      };
      if (secret) {
        headers["x-citacal-signature"] = sign(secret, timestamp, body);
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        throw new Error(`Webhook ${url} returned ${res.status}`);
      }
    })
  );
}

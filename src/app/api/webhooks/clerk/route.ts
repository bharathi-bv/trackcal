/**
 * POST /api/webhooks/clerk
 *
 * Receives Clerk webhook events. On user.created, links the new Clerk user
 * to a pending team_members row if their email matches an invite.
 *
 * This links invited members after they finish the OAuth-based signup flow.
 *
 * Setup: Clerk Dashboard → Webhooks → add endpoint, subscribe to user.created.
 */

import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase";

type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    email_addresses: { email_address: string }[];
  };
};

export async function POST(req: Request) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let evt: ClerkUserCreatedEvent;

  try {
    evt = wh.verify(payload, headers) as ClerkUserCreatedEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id: clerkUserId, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (email) {
      const db = createServerClient();
      // Link pending invite row (user_id is null until the invited user signs up)
      await db
        .from("team_members")
        .update({ user_id: clerkUserId })
        .eq("email", email)
        .is("user_id", null);
    }
  }

  return new Response("ok");
}

/**
 * analytics.ts
 *
 * Thin wrappers around GA4 and Mixpanel event calls.
 * Centralizing events here means: one place to add/change platforms,
 * components never import analytics SDKs directly.
 *
 * Events fired:
 *   booking_started   — on booking page load (user intent signal)
 *   booking_completed — on confirmation (the conversion event)
 *
 * Both events carry the full UTM + click-ID context — this is the core
 * TrackCal value prop. Ad platforms get accurate conversion attribution
 * instead of losing it at the Calendly iframe boundary.
 *
 * Why no top-level mixpanel import: mixpanel-browser accesses browser globals
 * at module load time. Importing it at the top level crashes Next.js SSR even
 * in "use client" components. Instead, AttributionCapture dynamically imports
 * it and registers the instance here via registerMixpanel().
 */

import { sendGAEvent } from "@next/third-parties/google";
import type { UtmParams } from "@/utils/attribution";
import type MixpanelLib from "mixpanel-browser";

type BookingCompletedData = {
  utmParams: UtmParams;
  date: string;
  time: string;
  email: string;
};

// Lazy singleton — set by AttributionCapture after dynamic import
let mp: typeof MixpanelLib | null = null;

export function registerMixpanel(instance: typeof MixpanelLib) {
  mp = instance;
}

export function trackBookingStarted(utmParams: UtmParams) {
  const props = { ...utmParams, product: "trackcal" };

  sendGAEvent("event", "booking_started", props);

  mp?.track("Booking Started", props);
}

export function trackBookingCompleted(data: BookingCompletedData) {
  const props = {
    ...data.utmParams,
    date: data.date,
    time: data.time,
    product: "trackcal",
  };

  sendGAEvent("event", "booking_completed", props);

  if (mp) {
    mp.track("Booking Completed", { ...props, email: data.email });
    // Link this anonymous visitor to a known person in Mixpanel
    mp.identify(data.email);
    mp.people.set({ $email: data.email, last_booking_date: data.date });
  }
}

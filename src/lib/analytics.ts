/**
 * analytics.ts
 *
 * Thin wrappers around GA4 and Mixpanel event calls.
 */

import { sendGAEvent } from "@next/third-parties/google";
import type { UtmParams } from "@/utils/attribution";
import type MixpanelLib from "mixpanel-browser";
import {
  resolveTrackingEventName,
  type TrackingEventAliases,
} from "@/lib/tracking-events";

type BookingCompletedData = {
  utmParams: UtmParams;
  date: string;
  time: string;
  email: string;
};

type TrackingOptions = {
  eventAliases?: TrackingEventAliases | null;
};

// Lazy singleton — set by AttributionCapture after dynamic import
let mp: typeof MixpanelLib | null = null;

export function registerMixpanel(instance: typeof MixpanelLib) {
  mp = instance;
}

export function trackBookingPageview(utmParams: UtmParams, options?: TrackingOptions) {
  const eventName = resolveTrackingEventName("booking_pageview", options?.eventAliases);
  const props = { ...utmParams, product: "citacal" };

  sendGAEvent("event", eventName, props);
  mp?.track(eventName, props);
}

export function trackBookingConversion(data: BookingCompletedData, options?: TrackingOptions) {
  const eventName = resolveTrackingEventName("booking_conversion", options?.eventAliases);
  const props = {
    ...data.utmParams,
    date: data.date,
    time: data.time,
    product: "citacal",
  };

  sendGAEvent("event", eventName, props);

  if (mp) {
    mp.track(eventName, { ...props, email: data.email });
    mp.identify(data.email);
    mp.people.set({ $email: data.email, last_booking_date: data.date });
  }
}

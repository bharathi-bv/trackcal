"use client";

/**
 * AttributionCapture
 *
 * Renders nothing — purely runs side effects on mount.
 * Placed in the root layout so it fires on every page load.
 *
 * Two jobs:
 * 1. Capture UTM params from URL → save to localStorage + Zustand store
 * 2. Initialize Mixpanel (must be client-side only)
 *
 * Why dynamic import for Mixpanel: mixpanel-browser accesses browser globals
 * (window, document, navigator) at module load time. Even in "use client"
 * components, Next.js runs an SSR pass on the server — a top-level import
 * crashes there and prevents the component from mounting entirely.
 * Dynamic import inside useEffect runs only in the browser, after hydration.
 */

import * as React from "react";
import { captureUtmParams } from "@/utils/attribution";
import { useBookingStore } from "@/store/bookingStore";
import { registerMixpanel } from "@/lib/analytics";

export default function AttributionCapture() {
  const setUtmParams = useBookingStore((s) => s.setUtmParams);

  React.useEffect(() => {
    // 1. Capture UTM params — runs immediately, no dependency on Mixpanel
    const params = captureUtmParams();
    setUtmParams(params);

    // 2. Dynamically import + init Mixpanel — deferred to idle so it doesn't
    //    block LCP. requestIdleCallback fires after the browser has finished
    //    painting the visible content.
    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (token && token !== "your_token_here") {
      const initMixpanel = () => {
        import("mixpanel-browser").then((mp) => {
          mp.default.init(token, {
            track_pageview: true,
            persistence: "localStorage",
          });
          registerMixpanel(mp.default);
        });
      };
      if ("requestIdleCallback" in window) {
        requestIdleCallback(initMixpanel, { timeout: 3000 });
      } else {
        setTimeout(initMixpanel, 2000);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

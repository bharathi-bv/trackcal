"use client";

import * as React from "react";

/**
 * Microsoft OAuth implicit-flow callback page.
 *
 * Microsoft redirects here with the access_token in the URL hash after the
 * user approves the calendar permission popup. This page reads the token,
 * postMessages it back to the opener (BookingWizard), then closes itself.
 */
export default function MsCallbackPage() {
  React.useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const error = params.get("error");

    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: "citacal:ms:callback", token: token ?? null, error: error ?? null },
          window.location.origin
        );
      } catch {
        // opener may have navigated away — ignore
      }
    }

    window.close();
  }, []);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 32,
        textAlign: "center",
        color: "#6E6E96",
        fontSize: 14,
      }}
    >
      Connecting your calendar…
    </div>
  );
}

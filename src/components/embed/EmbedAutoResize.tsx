"use client";

import * as React from "react";

export default function EmbedAutoResize() {
  React.useEffect(() => {
    // No-op when not inside an iframe.
    if (window.parent === window) return;

    const params = new URLSearchParams(window.location.search);
    const embedId = params.get("embed_id") ?? undefined;

    const postHeight = () => {
      const height = Math.ceil(
        Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0
        )
      );

      window.parent.postMessage(
        {
          type: "trackcal:embed:resize",
          height,
          embedId,
        },
        "*"
      );
    };

    postHeight();
    window.parent.postMessage({ type: "trackcal:embed:ready", embedId }, "*");

    const ro = new ResizeObserver(() => postHeight());
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);

    window.addEventListener("resize", postHeight);
    const interval = window.setInterval(postHeight, 1000);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", postHeight);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}

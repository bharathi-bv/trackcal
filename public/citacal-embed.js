/* CitaCal Embed Script
 *
 * Usage:
 * 1) Include script on your site:
 *    <script async src="https://YOUR_CITACAL_DOMAIN/citacal-embed.js" data-citacal-url="https://YOUR_CITACAL_DOMAIN"></script>
 *
 * 2) Add one or more containers:
 *    <div data-citacal-embed data-event="15-min-call"></div>
 *
 * Optional container attributes:
 * - data-host: public username used in /{host}/{event} booking URLs
 * - data-event: event slug
 * - data-height: initial iframe height (default: 760)
 *
 * Optional script attributes:
 * - data-citacal-forward="false" -> disables auto forwarding to dataLayer/gtag/mixpanel
 * - data-citacal-event-prefix="citacal_" -> analytics event prefix
 * - data-citacal-event-map='{"booking_confirmed":"lead_submitted"}' -> per-event override
 * - data-citacal-fallback="false" -> disables fallback CTA when iframe can't load
 * - data-citacal-timeout-ms="12000" -> fallback timeout in milliseconds
 */
(function () {
  var script = document.currentScript;
  var configuredBase = script && script.dataset ? script.dataset.citacalUrl : "";
  var inferredBase = script && script.src ? new URL(script.src).origin : window.location.origin;
  var baseUrl = (configuredBase || inferredBase).replace(/\/+$/, "");
  var baseOrigin = new URL(baseUrl).origin;
  var autoForward = !(script && script.dataset && script.dataset.citacalForward === "false");
  var eventPrefix = (script && script.dataset && script.dataset.citacalEventPrefix) || "citacal_";
  var fallbackEnabled = !(script && script.dataset && script.dataset.citacalFallback === "false");
  var timeoutMs = Number(
    (script && script.dataset && script.dataset.citacalTimeoutMs) || 12000
  );
  if (!Number.isFinite(timeoutMs) || timeoutMs < 3000) timeoutMs = 12000;
  var eventMap = Object.create(null);
  if (script && script.dataset && script.dataset.citacalEventMap) {
    try {
      var parsed = JSON.parse(script.dataset.citacalEventMap);
      if (parsed && typeof parsed === "object") eventMap = parsed;
    } catch {
      // Ignore invalid JSON map.
    }
  }

  var framesById = Object.create(null);
  var REDACT_KEYS = {
    email: true,
    name: true,
    phone: true,
    notes: true,
    attendee_email: true,
    attendee_name: true,
  };

  function randomId() {
    return "tc_" + Math.random().toString(36).slice(2, 10);
  }

  function sanitizePayload(raw) {
    var out = {};
    if (!raw || typeof raw !== "object") return out;
    Object.keys(raw).forEach(function (key) {
      if (REDACT_KEYS[key]) return;
      var value = raw[key];
      var t = typeof value;
      if (value == null || t === "string" || t === "number" || t === "boolean") {
        out[key] = value;
      }
    });
    return out;
  }

  function dispatchWindowEvent(type, detail) {
    if (typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(type, { detail: detail }));
  }

  function forwardAnalytics(name, payload) {
    var mapped = eventMap[name];
    var prefixedName =
      typeof mapped === "string" && mapped.trim()
        ? mapped.trim()
        : eventPrefix + name;
    var analyticsPayload = Object.assign({ citacal_event: name }, payload);

    if (autoForward && Array.isArray(window.dataLayer)) {
      window.dataLayer.push(
        Object.assign(
          {
            event: prefixedName,
          },
          analyticsPayload
        )
      );
    }

    if (autoForward && typeof window.gtag === "function") {
      window.gtag("event", prefixedName, analyticsPayload);
    }

    if (
      autoForward &&
      window.mixpanel &&
      typeof window.mixpanel.track === "function"
    ) {
      window.mixpanel.track(prefixedName, analyticsPayload);
    }
  }

  function emitBookingEvent(name, payload) {
    var detail = {
      name: name,
      payload: payload,
      source: "citacal-embed",
    };

    forwardAnalytics(name, payload);
    dispatchWindowEvent("citacal:booking:event", detail);
    dispatchWindowEvent("citacal:" + name, detail);

    if (typeof window.citacalEmbedOnEvent === "function") {
      try {
        window.citacalEmbedOnEvent(detail);
      } catch {
        // Intentionally swallow callback errors from host page.
      }
    }
  }

  function buildSrc(container) {
    var params = new URLSearchParams();
    var eventSlug = container.getAttribute("data-event");
    var hostSlug =
      container.getAttribute("data-host") ||
      (script && script.dataset ? script.dataset.citacalHost : "") ||
      "";
    if (eventSlug) params.set("event", eventSlug);

    // Forward attribution params from parent page URL so embedded booking
    // captures campaign context exactly like direct /book visits.
    var parentParams = new URLSearchParams(window.location.search);
    var TRACKED_KEYS = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "li_fat_id",
      "ttclid",
      "msclkid",
    ];
    TRACKED_KEYS.forEach(function (key) {
      var val = parentParams.get(key);
      if (val) params.set(key, val);
    });

    var bookingParams = params.toString();

    var embedId = randomId();
    params.set("embed_id", embedId);

    var bookingUrl = null;
    if (hostSlug && eventSlug) {
      bookingUrl = baseUrl + "/" + hostSlug + "/" + eventSlug + (bookingParams ? "?" + bookingParams : "");
    }

    return {
      embedId: embedId,
      eventSlug: eventSlug || null,
      bookingUrl: bookingUrl,
      src: baseUrl + "/embed?" + params.toString(),
    };
  }

  function clearLoadTimeout(frame) {
    if (!frame || !frame.timeoutId) return;
    window.clearTimeout(frame.timeoutId);
    frame.timeoutId = null;
  }

  function markFrameReady(frame) {
    if (!frame || !frame.iframe) return;
    frame.ready = true;
    clearLoadTimeout(frame);
    frame.iframe.style.opacity = "1";
  }

  function showFallback(frame, reason) {
    if (!frame || !frame.container || frame.fallbackShown || !fallbackEnabled) return;
    frame.fallbackShown = true;
    clearLoadTimeout(frame);

    var card = document.createElement("div");
    card.style.border = "1px solid #e5e7eb";
    card.style.borderRadius = "12px";
    card.style.padding = "16px";
    card.style.background = "#ffffff";
    card.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    card.style.color = "#111827";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "10px";

    var title = document.createElement("div");
    title.textContent = "Scheduling widget couldn\u2019t load here.";
    title.style.fontSize = "14px";
    title.style.fontWeight = "600";

    var body = document.createElement("div");
    body.textContent = reason || "Open the booking page directly.";
    body.style.fontSize = "13px";
    body.style.color = "#4b5563";

    var link = document.createElement("a");
    link.href = frame.bookingUrl || baseUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open booking page";
    link.style.display = "inline-flex";
    link.style.alignItems = "center";
    link.style.justifyContent = "center";
    link.style.width = "fit-content";
    link.style.padding = "8px 12px";
    link.style.borderRadius = "8px";
    link.style.textDecoration = "none";
    link.style.fontSize = "13px";
    link.style.fontWeight = "600";
    link.style.background = "#2563eb";
    link.style.color = "#ffffff";

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(link);
    frame.container.innerHTML = "";
    frame.container.appendChild(card);
  }

  function mountContainer(container) {
    if (container.getAttribute("data-citacal-mounted") === "1") return;
    container.setAttribute("data-citacal-mounted", "1");

    var result = buildSrc(container);
    var mobileHeight = Number(container.getAttribute("data-height-mobile") || 700);
    if (!Number.isFinite(mobileHeight) || mobileHeight < 480) mobileHeight = 700;
    var desktopHeight = Number(container.getAttribute("data-height") || 760);
    if (!Number.isFinite(desktopHeight) || desktopHeight < 560) desktopHeight = 760;
    var initialHeight =
      window.matchMedia && window.matchMedia("(max-width: 640px)").matches
        ? mobileHeight
        : desktopHeight;

    var iframe = document.createElement("iframe");
    iframe.src = result.src;
    iframe.title = "CitaCal Booking";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "clipboard-write";
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.borderRadius = "12px";
    iframe.style.background = "transparent";
    iframe.style.minHeight = String(initialHeight) + "px";
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 180ms ease";
    iframe.setAttribute("scrolling", "no");

    framesById[result.embedId] = {
      iframe: iframe,
      container: container,
      eventSlug: result.eventSlug,
      bookingUrl: result.bookingUrl,
      ready: false,
      fallbackShown: false,
      timeoutId: null,
    };
    container.innerHTML = "";
    container.appendChild(iframe);

    if (fallbackEnabled) {
      framesById[result.embedId].timeoutId = window.setTimeout(function () {
        showFallback(framesById[result.embedId], "Open the booking page directly.");
      }, timeoutMs);
    }

    iframe.addEventListener("load", function () {
      markFrameReady(framesById[result.embedId]);
    });

    iframe.addEventListener("error", function () {
      showFallback(framesById[result.embedId], "Open the booking page directly.");
    });
  }

  function mountAll() {
    var containers = document.querySelectorAll("[data-citacal-embed]");
    containers.forEach(mountContainer);
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== baseOrigin) return;
    var data = event.data || {};
    if (data.type === "citacal:embed:ready") {
      var readyFrame = framesById[data.embedId];
      if (readyFrame) markFrameReady(readyFrame);
      return;
    }
    if (data.type === "citacal:embed:resize") {
      var resizeTarget = framesById[data.embedId];
      if (!resizeTarget || !resizeTarget.iframe) return;
      markFrameReady(resizeTarget);

      var nextHeight = Number(data.height);
      if (!Number.isFinite(nextHeight) || nextHeight < 320) return;
      resizeTarget.iframe.style.height = String(nextHeight) + "px";
      return;
    }

    if (data.type !== "citacal:booking:event") return;

    var frame = framesById[data.embedId];
    if (!frame) return;

    var eventName = typeof data.name === "string" ? data.name : "";
    if (!eventName) return;

    var payload = sanitizePayload(data.payload);
    payload.booking_flow = "iframe_embed";
    payload.event_source = "citacal_embed";
    payload.citacal_event_name = eventName;
    payload.embed_id = data.embedId || null;
    payload.event_slug = payload.event_slug || frame.eventSlug || null;
    payload.parent_url = window.location.href;
    payload.timestamp = data.timestamp || Date.now();

    emitBookingEvent(eventName, payload);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();

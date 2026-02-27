/* TrackCal Embed Script
 *
 * Usage:
 * 1) Include script on your site:
 *    <script async src="https://YOUR_TRACKCAL_DOMAIN/trackcal-embed.js" data-trackcal-url="https://YOUR_TRACKCAL_DOMAIN"></script>
 *
 * 2) Add one or more containers:
 *    <div data-trackcal-embed data-event="15-min-call"></div>
 *
 * Optional container attributes:
 * - data-event: event slug
 * - data-height: initial iframe height (default: 760)
 */
(function () {
  var script = document.currentScript;
  var configuredBase = script && script.dataset ? script.dataset.trackcalUrl : "";
  var inferredBase = script && script.src ? new URL(script.src).origin : window.location.origin;
  var baseUrl = (configuredBase || inferredBase).replace(/\/+$/, "");
  var baseOrigin = new URL(baseUrl).origin;

  var framesById = Object.create(null);

  function randomId() {
    return "tc_" + Math.random().toString(36).slice(2, 10);
  }

  function buildSrc(container) {
    var params = new URLSearchParams();
    var eventSlug = container.getAttribute("data-event");
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

    var embedId = randomId();
    params.set("embed_id", embedId);

    return {
      embedId: embedId,
      src: baseUrl + "/embed?" + params.toString(),
    };
  }

  function mountContainer(container) {
    if (container.getAttribute("data-trackcal-mounted") === "1") return;
    container.setAttribute("data-trackcal-mounted", "1");

    var result = buildSrc(container);
    var iframe = document.createElement("iframe");
    iframe.src = result.src;
    iframe.title = "TrackCal Booking";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "clipboard-write";
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.borderRadius = "12px";
    iframe.style.background = "transparent";
    iframe.style.minHeight = (container.getAttribute("data-height") || "760") + "px";
    iframe.setAttribute("scrolling", "no");

    framesById[result.embedId] = iframe;
    container.innerHTML = "";
    container.appendChild(iframe);
  }

  function mountAll() {
    var containers = document.querySelectorAll("[data-trackcal-embed]");
    containers.forEach(mountContainer);
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== baseOrigin) return;
    var data = event.data || {};
    if (data.type !== "trackcal:embed:resize") return;

    var iframe = framesById[data.embedId];
    if (!iframe) return;

    var nextHeight = Number(data.height);
    if (!Number.isFinite(nextHeight) || nextHeight < 320) return;
    iframe.style.height = String(nextHeight) + "px";
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll);
  } else {
    mountAll();
  }
})();

# Trackcal Internal SOP: Attribution Tracking (Direct Link vs Embed)

Last updated: March 5, 2026  
Owner: Growth + Product + Engineering

## 1) Purpose

This document is the internal source of truth for:

- How Trackcal attribution works today end-to-end.
- What changes by channel and by deployment mode (`direct link` vs `JS embed` vs `static iframe`).
- Exact field names/payload keys in our codebase.
- Setup steps per platform.
- QA test cases and SQL validation queries.

---

## 2) Current Architecture (What Actually Happens in Code)

### 2.1 Capture layer (browser)

File references:
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/components/AttributionCapture.tsx](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/components/AttributionCapture.tsx)
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/utils/attribution.ts](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/utils/attribution.ts)

Flow:
1. `AttributionCapture` runs on page load.
2. `captureUtmParams()` reads tracked URL params.
3. Maps URL `_gl` to `ga_linker`.
4. If `fbc/fbp` are missing in URL, attempts cookie fallback from `_fbc/_fbp`.
5. Stores values in localStorage key `citacal_utm` for 30 days.
6. Writes values into Zustand store (`utmParams`) for booking submit payload.

### 2.2 Booking submit layer

File reference:
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/components/booking/BookingWizard.tsx](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/components/booking/BookingWizard.tsx)

Flow:
1. User confirms slot and details.
2. Client POSTs `/api/bookings` with `...utmParams`.
3. `booking_started` and `booking_completed` events are fired to GA/Mixpanel wrappers.

### 2.3 Server persistence + fanout layer

File references:
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/app/api/bookings/route.ts](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/app/api/bookings/route.ts)
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/lib/booking-side-effects.ts](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/lib/booking-side-effects.ts)
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/lib/webhooks.ts](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/lib/webhooks.ts)

Flow:
1. `/api/bookings` stores booking row with attribution fields.
2. Side effects run:
   - Google Sheets row upsert.
   - Webhook dispatch (`booking.confirmed`, etc.).
3. Webhook includes normalized `utm` object and `click_ids` object.

### 2.4 Embed transport layer

File reference:
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/public/citacal-embed.js](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/public/citacal-embed.js)

Flow:
1. JS embed reads parent page query params.
2. Forwards UTMs/click IDs + `_gl` into embed URL.
3. Falls back to parent cookies for `_fbc/_fbp` when needed.
4. Emits booking lifecycle events to parent via `postMessage`.

---

## 3) Canonical Attribution Fields

### 3.1 Stored booking columns / API fields

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `gclid`
- `gbraid`
- `wbraid`
- `fbclid`
- `fbc`
- `fbp`
- `li_fat_id`
- `ttclid`
- `msclkid`
- `ga_linker` (derived from URL `_gl`)

Migration reference:
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/supabase/migrations/20260305_extended_attribution_fields.sql](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/supabase/migrations/20260305_extended_attribution_fields.sql)

### 3.2 Webhook payload sections

- `utm.source|medium|campaign|term|content`
- `click_ids.gclid|gbraid|wbraid|fbclid|fbc|fbp|li_fat_id|ttclid|msclkid|ga_linker`

---

## 4) Channel Matrix: Direct Link vs Embed

Recommended definitions:
- `Direct link`: ad -> Trackcal booking URL directly.
- `JS embed`: `<script .../citacal-embed.js>` + `<div data-citacal-embed ...>`.
- `Static iframe`: manual `<iframe>` without our JS bridge.

| Channel | Direct Link | JS Embed | Static iframe | Required Setup |
|---|---|---|---|---|
| GA4 continuity | Best chance of source/session continuity; `_gl` can pass when linker is configured. | Good if embed JS forwards `_gl`; still depends on site tagging consistency. | Weak; linker + event visibility is often partial. | Set `booking_base_url`; configure GA4 ID in host settings; ensure cross-domain linker where needed. |
| Google Ads (`gclid`,`gbraid`,`wbraid`) | Strong if auto-tagging and redirects preserve params. | Strong if parent URL has params and embed JS forwards them. | Risky if IDs are not propagated into iframe URL. | Google auto-tagging on; URL template with UTMs + braids; validate IDs in bookings table. |
| Meta (`fbclid`,`fbc`,`fbp`) | Good with URL + cookie availability. | Good; embed JS includes URL values and `_fbc/_fbp` fallback. | Medium/low; cookie/param transport can break. | Meta Pixel ID in settings + server webhook pipeline for CAPI mapping; preserve `fbc/fbp`. |
| LinkedIn (`li_fat_id`) | Good if destination template includes `li_fat_id`. | Good if parent receives `li_fat_id` and embed forwards. | Weak if iframe URL lacks click param. | LinkedIn Partner ID in settings; include `li_fat_id` in ad URL template; map to CRM. |
| Microsoft Ads (`msclkid`) | Good with auto-tag + clean redirects. | Good with embed forwarding. | Medium/low if param loss. | Add `msclkid` in template; map webhook `click_ids.msclkid` for offline conversion upload. |
| TikTok (`ttclid`) | Good with ttclid append + no stripping. | Good with embed forwarding. | Medium/low if param loss. | Add `ttclid`; map webhook `click_ids.ttclid` in Events API workflow. |

Bottom line:
- Best overall reliability: `Direct link`.
- Acceptable: `JS embed`.
- Avoid for attribution-critical flows: `Static iframe`.

---

## 5) Setup SOP (Platform-by-Platform)

## 5.1 Common base setup (always do first)

In app settings (`Integrations2`):
1. Set `booking_base_url` to your own domain (prefer `book.yourdomain.com`).
2. Set analytics IDs:
   - `google_analytics_id` (`G-...`)
   - `google_tag_manager_id` (`GTM-...`)
   - `meta_pixel_id` (numeric)
   - `linkedin_partner_id` (numeric)
3. Add webhook endpoint(s) in `webhook_urls`.
4. Use direct booking links in ads where possible.
5. If embed is required, use `citacal-embed.js`, not raw iframe.

Settings API reference:
- [/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/app/api/settings/route.ts](/Users/bharathi/Downloads/01 Devving/Projects/trackcal/src/app/api/settings/route.ts)

## 5.2 Google Ads

Ad URL requirements:
- Auto-tagging enabled.
- Include UTMs and preserve Google IDs:
  - `utm_source=google`
  - `utm_medium=cpc`
  - `utm_campaign={campaignid}`
  - `utm_term={keyword}`
  - `utm_content={creative}`
  - `gclid={gclid}`
  - `gbraid={gbraid}`
  - `wbraid={wbraid}`

Internal mapping:
- `click_ids.gclid` / `click_ids.gbraid` / `click_ids.wbraid` -> CRM/offline conversion pipeline.

## 5.3 Meta Ads

URL requirements:
- Include UTMs, preserve `fbclid` if present.

Tracking requirements:
- Pixel ID configured in settings.
- Keep `fbc/fbp` from URL or cookie fallback.
- Server-side webhook mapping to CAPI payload recommended.

Internal mapping:
- `click_ids.fbclid`, `click_ids.fbc`, `click_ids.fbp`.

## 5.4 LinkedIn Ads

URL requirements:
- Include `li_fat_id={li_fat_id}` in destination template.
- Add UTMs with `utm_source=linkedin`.

Tracking requirements:
- LinkedIn Partner ID configured in settings.

Internal mapping:
- `click_ids.li_fat_id` -> contact/deal custom property.

## 5.5 Microsoft Ads

URL requirements:
- Include `msclkid={msclkid}` + UTMs.

Internal mapping:
- `click_ids.msclkid` -> offline conversion workflow.

## 5.6 TikTok Ads

URL requirements:
- Include `ttclid={ttclid}` + UTMs.

Internal mapping:
- `click_ids.ttclid` -> Events API workflow.

## 5.7 CRM / automation (HubSpot, Salesforce, Zapier, Make)

Required mapping:
1. Upsert contact by `booking.email`.
2. Map `utm.*` to source fields.
3. Map non-null `click_ids.*` to dedicated properties.
4. Enforce idempotency using webhook header `x-citacal-delivery-id`.
5. Do not overwrite existing click IDs with nulls.

---

## 6) Payload Schemas (Exact Key Names)

### 6.1 `/api/bookings` request body (attribution subset)

```json
{
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "spring-demo",
  "utm_term": "crm software",
  "utm_content": "ad-variant-a",
  "gclid": "CjwK...",
  "gbraid": null,
  "wbraid": null,
  "li_fat_id": null,
  "fbclid": null,
  "fbc": "fb.1.171...",
  "fbp": "fb.1.171...",
  "ttclid": null,
  "msclkid": null,
  "ga_linker": "1*abc..."
}
```

### 6.2 Webhook payload (canonical)

```json
{
  "event": "booking.confirmed",
  "occurred_at": "2026-03-05T09:00:00.000Z",
  "booking": {
    "id": "uuid",
    "event_slug": "demo-30min",
    "date": "2026-03-10",
    "time": "02:00 PM",
    "name": "Alice Chen",
    "email": "alice@example.com",
    "status": "confirmed"
  },
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "spring-demo",
    "term": null,
    "content": null
  },
  "click_ids": {
    "gclid": "CjwK...",
    "gbraid": null,
    "wbraid": null,
    "fbclid": null,
    "fbc": null,
    "fbp": null,
    "li_fat_id": null,
    "ttclid": null,
    "msclkid": null,
    "ga_linker": "1*abc..."
  }
}
```

---

## 7) QA Runbook

## 7.1 Preflight

1. Confirm `booking_base_url` uses our domain.
2. Confirm analytics IDs are saved.
3. Confirm webhook endpoint receives test payload.
4. Confirm latest migration applied for extended attribution fields.

## 7.2 Test cases by channel and mode

Use one test click for each case below and complete a real booking.

| Case ID | Channel | Mode | Test URL Must Include | Expected DB / Analytics Result |
|---|---|---|---|---|
| G-1 | Google Ads | Direct link | `gclid` (+ UTMs, optionally `gbraid/wbraid`) | Booking row has `utm_source=google` and non-null `gclid` (or braid). |
| G-2 | Google Ads | JS embed | Same as G-1 on parent URL | Booking row has same click IDs; webhook `click_ids.gclid` present. |
| M-1 | Meta | Direct link | `fbclid` + UTMs | `fbclid` captured; `fbc/fbp` may also appear if cookies set. |
| M-2 | Meta | JS embed | `fbclid` on parent URL | `fbclid` plus possible `_fbc/_fbp` fallback captured. |
| LI-1 | LinkedIn | Direct link | `li_fat_id` + UTMs | Non-null `li_fat_id` and correct source/campaign. |
| LI-2 | LinkedIn | JS embed | `li_fat_id` on parent URL | `li_fat_id` persists into booking payload and webhook. |
| MS-1 | Microsoft | Direct link | `msclkid` + UTMs | Non-null `msclkid` in bookings and webhook. |
| TT-1 | TikTok | Direct link | `ttclid` + UTMs | Non-null `ttclid` in bookings and webhook. |
| X-1 | Any | Static iframe | Same params | Higher risk of missing IDs; use as regression detector only. |

## 7.3 SQL verification queries (Supabase SQL editor)

Coverage snapshot:

```sql
select
  count(*) as total_bookings,
  count(*) filter (where utm_source is not null) as with_utm_source,
  count(*) filter (
    where gclid is not null
       or gbraid is not null
       or wbraid is not null
       or fbclid is not null
       or fbc is not null
       or fbp is not null
       or li_fat_id is not null
       or ttclid is not null
       or msclkid is not null
       or ga_linker is not null
  ) as with_any_click_id
from public.bookings;
```

Per-channel counts:

```sql
select
  count(*) filter (where gclid is not null) as gclid_count,
  count(*) filter (where gbraid is not null) as gbraid_count,
  count(*) filter (where wbraid is not null) as wbraid_count,
  count(*) filter (where fbclid is not null) as fbclid_count,
  count(*) filter (where fbc is not null) as fbc_count,
  count(*) filter (where fbp is not null) as fbp_count,
  count(*) filter (where li_fat_id is not null) as li_fat_id_count,
  count(*) filter (where ttclid is not null) as ttclid_count,
  count(*) filter (where msclkid is not null) as msclkid_count,
  count(*) filter (where ga_linker is not null) as ga_linker_count
from public.bookings;
```

Inspect latest 50 rows for debugging:

```sql
select
  created_at,
  email,
  utm_source,
  utm_medium,
  utm_campaign,
  gclid, gbraid, wbraid,
  fbclid, fbc, fbp,
  li_fat_id, ttclid, msclkid,
  ga_linker
from public.bookings
order by created_at desc
limit 50;
```

## 7.4 Pass/Fail criteria

- Pass if:
  - Channel-specific click ID appears for each test case.
  - Webhook includes matching `click_ids.*`.
  - `utm_source` and `utm_campaign` are non-null for paid tests.
- Fail if:
  - Test clicks create bookings with null channel click ID.
  - Embed case diverges from direct link with same input URL.
  - CRM mapping overwrites historical click IDs with nulls.

---

## 8) Known Limits and Recommended Defaults

1. Best attribution accuracy: send paid traffic to direct Trackcal booking URLs.
2. If embed is required: use `citacal-embed.js`; avoid static iframes.
3. Always combine UTMs + platform click IDs.
4. Treat webhook/server pipeline as source of truth for downstream ad/CRM reconciliation.


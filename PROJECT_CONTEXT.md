# TrackCal Project Context

Last updated: 2026-02-26

## Purpose
TrackCal is an attribution-safe scheduling app. It captures UTM/click IDs on entry and preserves them through booking conversion, then stores attribution data with each booking.

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Zustand (booking state)
- Supabase (data + auth)
- Google Calendar API via `googleapis` (OAuth, availability, event creation)
- Analytics: GA4 (`@next/third-parties`) + Mixpanel
- Tailwind v4 + shadcn UI + custom TrackCal design tokens

## Product Areas (Current)
- Public booking: `/book`
- Auth: `/auth/login`, `/auth/signup`, `/auth/callback`
- Dashboard: `/dashboard` (bookings + attribution stats, filters, CSV export)
- Event Types management: `/dashboard/event-types`
- Host Settings: `/dashboard/settings`

## Main User Flow
1. User opens booking page at `/book`.
2. Attribution params are captured client-side (`AttributionCapture`) and stored in Zustand + localStorage (30-day expiry).
3. `/book` server-loads optional event type (`?event=slug`) and host profile from Supabase.
4. User picks date/time in `BookingWizard` using `ThreeDaySlotPicker` + mini calendar.
5. Slot availability is fetched via `/api/availability?date=YYYY-MM-DD[&event=slug]`.
6. Event-type settings (duration, start/end hours, slot increment) drive slot generation.
7. User enters details in `DetailsForm`.
8. Booking submit calls `POST /api/bookings` with details + attribution + optional `event_slug`.
9. API writes to Supabase and attempts Google Calendar event creation (duration-aware).
10. UI moves to confirmation state (`step === 4`), analytics conversion event fires.

## Booking UI Architecture (Current)
- `BookingWizard` accepts:
  - `eventType` (name, slug, duration, description, hours, slot increment)
  - `hostProfile` (host name + profile image)
- Left panel behavior:
  - Host avatar/photo + event metadata
  - Inline mini calendar in step 1
  - Compact timezone selector with live local time
  - Locked-in selected date/time card in step 2
- Step 1 behavior:
  - 3-day time grid (`ThreeDaySlotPicker`) with:
    - Cached day-slot responses (prevents grey flash on navigation)
    - Visual blocked overlays for unavailable ranges
    - Current-time indicator
    - Prev/next 3-day window navigation
  - Anchor date (window control) is decoupled from selected booking date/time
- Responsive behavior:
  - Mobile stacks booking shell and step-1 calendar/slots sections via custom CSS classes

## Key Frontend Files
- `src/app/book/page.tsx`: booking page entry and server-side event/host data fetch
- `src/components/booking/BookingWizard.tsx`: primary step flow/UI and booking submit
- `src/components/booking/ThreeDaySlotPicker.tsx`: multi-day slot grid and availability rendering
- `src/components/booking/DetailsForm.tsx`: form validation with `react-hook-form` + Zod
- `src/store/bookingStore.ts`: Zustand state (step/date/time/details/UTM)
- `src/components/AttributionCapture.tsx`: UTM capture + Mixpanel init
- `src/utils/attribution.ts`: tracked params + localStorage persistence
- `src/components/dashboard/*`: dashboard nav, event types/settings clients, CSV export
- `src/app/globals.css`: global styles + token wiring + dashboard/booking responsive rules

## Key Backend/API Files
- `src/app/api/availability/route.ts`: availability endpoint with optional event-type settings
- `src/app/api/bookings/route.ts`: create/list bookings, event duration lookup, calendar event call
- `src/app/api/event-types/route.ts`: list/create event types
- `src/app/api/event-types/[id]/route.ts`: update/delete event type
- `src/app/api/settings/route.ts`: get/update host profile settings
- `src/app/api/auth/google/route.ts`: start Google Calendar OAuth
- `src/app/api/auth/google/callback/route.ts`: Google OAuth callback
- `src/lib/google-calendar.ts`: OAuth URL, token exchange/persistence, freebusy slots, event creation
- `src/lib/supabase.ts`: service-role server client + browser-safe client
- `src/lib/supabase-browser.ts`: browser auth client helper
- `src/lib/supabase-server.ts`: server auth client helper (cookie-backed session)

## Data/State Model (High Level)
- Booking state in Zustand:
  - `step`: `1 | 2 | 3 | 4` (UI currently uses 1,2,4)
  - `selectedDate`, `selectedTime`
  - `details`: name/email/phone/notes
  - `utmParams`: URL attribution payload
- Supabase tables expected:
  - `bookings`: booking + attribution columns
  - `event_types`: scheduling templates (slug, duration, hours, slot increment, active)
  - `host_settings`: Google OAuth tokens + host profile fields
  - `auth.users` (Supabase Auth): dashboard access/session

## Environment Variables (Names Only)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_MIXPANEL_TOKEN`

## Known Implementation Notes
- Availability endpoint returns `{ slots: null }` if Google Calendar is not connected; booking UI treats this as all slots available for graceful fallback.
- Booking insert is primary; calendar event creation is best-effort and non-fatal.
- Calendar availability supports variable duration + slot increments and prevents past-time booking.
- Timezone handling in calendar logic uses offset-at-date calculations and UTC comparisons.
- `/dashboard*` routes enforce auth server-side and redirect unauthenticated users to `/auth/login`.
- `README.md` is mostly default Next.js scaffold and does not document TrackCal specifics.
- Check `git status` before assuming baseline state.

## Dev Commands
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run start`

## Session Working Guidelines
- Avoid exposing secrets from `.env.local` in logs or docs.
- Prefer preserving current architecture patterns:
  - Client state in Zustand
  - Server writes through API routes
  - Analytics wrappers centralized in `src/lib/analytics.ts`
  - Google integration centralized in `src/lib/google-calendar.ts`

## Added External Context (Temp Support Files)
Source files:
- `/Users/bharathi/Downloads/01 Devving/Projects/Temp support files/Role, pivot context.md`
- `/Users/bharathi/Downloads/01 Devving/Projects/Temp support files/Trackcal Learning Plan.md`

### Role/Pivot Context Summary
- Strategic direction: evolve from growth leadership to growth engineering (higher experiment velocity via AI-assisted building).
- Core execution model: faster build-learn loops (roughly days, not weeks), with prioritization and judgment as key constraints.
- Positioning: combine growth strategy (funnel/attribution/A-B testing) with hands-on shipping in product code.
- Skill philosophy: AI handles boilerplate; focus on architecture decisions, debugging, trade-offs, and production judgment.
- TrackCal framing in this doc: portfolio-grade proof of growth-native engineering (attribution + scheduling + analytics).

### TrackCal Learning Plan Summary
- Structured 10-phase plan (about 100 hours) from setup to deployment/docs.
- Major phases:
  - Foundation and booking UI
  - Multi-step booking flow with Zustand
  - Attribution capture + analytics instrumentation
  - Google Calendar OAuth/availability/event creation
  - Backend/database hardening
  - Auth/workspaces
  - Round-robin logic
  - Dashboard/reporting
  - Polish
  - Deploy/documentation
- Operating pattern per phase: build tasks, explicit AI prompts, study tasks, literacy checks, and deliverables.
- Practical use for this repo: treat the plan as roadmap and checkpoint rubric; prioritize shipping + understanding over writing everything from scratch.

### How To Use This Context During Development
- Prefer tasks that increase validated learning speed (instrumentation, clear events, fast iteration).
- Keep implementation decisions tied to measurable outcomes (conversion, attribution quality, booking completion).
- Maintain production-safe defaults while allowing temporary experiment code where learning value is high.

# TrackCal Project Context

Last updated: 2026-02-25

## Purpose
TrackCal is an attribution-safe scheduling app. It captures UTM/click IDs on entry and preserves them through booking conversion, then stores attribution data with each booking.

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Zustand (booking state)
- Supabase (bookings + host settings)
- Google Calendar API via `googleapis` (OAuth, availability, event creation)
- Analytics: GA4 (`@next/third-parties`) + Mixpanel
- Tailwind v4 + shadcn UI + custom TrackCal design tokens

## Main User Flow
1. User opens booking page at `/book`.
2. Attribution params are captured client-side (`AttributionCapture`) and stored in Zustand + localStorage (30-day expiry).
3. User picks date/time in `BookingWizard`.
4. `TimeSlotSelector` fetches `/api/availability?date=YYYY-MM-DD`.
5. User enters details in `DetailsForm`.
6. Booking submit calls `POST /api/bookings` with details + attribution.
7. API writes to Supabase and attempts Google Calendar event creation.
8. UI moves to confirmation state (`step === 4`), analytics conversion event fires.

## Key Frontend Files
- `src/app/book/page.tsx`: booking page entry
- `src/components/booking/BookingWizard.tsx`: primary step flow/UI
- `src/components/booking/TimeSlotSelector.tsx`: availability fetch + fallback slot logic
- `src/components/booking/DetailsForm.tsx`: form validation with `react-hook-form` + Zod
- `src/store/bookingStore.ts`: Zustand state (step/date/time/details/UTM)
- `src/components/AttributionCapture.tsx`: UTM capture + Mixpanel init
- `src/utils/attribution.ts`: tracked params + localStorage persistence
- `src/app/globals.css`: global styles + design token wiring

## Key Backend/API Files
- `src/app/api/availability/route.ts`: availability endpoint
- `src/app/api/bookings/route.ts`: create/list bookings
- `src/app/api/auth/google/route.ts`: start OAuth
- `src/app/api/auth/google/callback/route.ts`: OAuth callback
- `src/lib/google-calendar.ts`: OAuth URL, token exchange/persistence, freebusy sloting, event creation
- `src/lib/supabase.ts`: browser and server clients

## Data/State Model (High Level)
- Booking state in Zustand:
  - `step`: `1 | 2 | 3 | 4` (UI currently uses 1,2,4)
  - `selectedDate`, `selectedTime`
  - `details`: name/email/phone/notes
  - `utmParams`: URL attribution payload
- Supabase tables expected:
  - `bookings`: booking + attribution columns
  - `host_settings`: stored Google OAuth tokens for host calendar

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
- Availability falls back to hardcoded slots if Google Calendar is not connected.
- Booking insert is primary; calendar event creation is best-effort and non-fatal.
- Timezone handling in calendar logic uses offset-at-date calculations and UTC comparisons.
- `README.md` is mostly default Next.js scaffold and does not document TrackCal specifics.
- There are existing uncommitted changes in booking/calendar files (do not assume clean git state).

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

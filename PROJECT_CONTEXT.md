# CitaCal Project Context

Last updated: 2026-03-05

## Purpose
CitaCal is an attribution-safe scheduling app with team-aware round-robin scheduling. It captures UTM/click IDs on entry, preserves attribution through booking conversion, and stores attribution with each booking.

## Brand + Copy Rules
- Product name in user-facing copy is always `CitaCal` (not Trackcal/TrackCal).
- Never show `localhost` or local development URLs in user-facing app screens or Help Docs.
- For public examples/previews/snippets, use `https://citacal.com` (or a real custom domain/subdomain).

## Tech Stack
- Next.js 16 (App Router)
- React 19 + TypeScript
- Zustand (booking state)
- Supabase (data + auth)
- Google Calendar API via `googleapis` (OAuth, availability, event creation)
- Analytics: GA4 (`@next/third-parties`) + Mixpanel
- Tailwind v4 + shadcn UI + custom CitaCal design tokens

## Route Structure (Current)
- Public booking: `/book`
- Auth pages: `/login`, `/signup`, `/auth/callback`, `/auth/signout`
- Protected app shell: `/app/*` (middleware-enforced)
  - Admin dashboard: `/app/dashboard`
  - Event types: `/app/dashboard/event-types`
  - Admin settings: `/app/dashboard/settings`
  - Team member portal: `/app/member/settings`

## Access Model
- Middleware (`src/proxy.ts`) enforces auth for `/app/*`.
- Dashboard layout (`src/app/app/dashboard/layout.tsx`) role-gates:
  - team member accounts are redirected to `/app/member/settings`
  - admin users stay in dashboard routes
- Team-member account linkage:
  - invite signups hit `/auth/callback`
  - callback links `team_members.user_id = auth.users.id`

## Main Booking Flow (Current)
1. User opens `/book` (optional `?event=slug`).
2. Attribution is captured client-side (`AttributionCapture`) and persisted.
3. Booking UI fetches availability from `/api/availability?date=...&event=...`.
4. Availability resolves event rules:
   - booking window (rolling or fixed)
   - custom/default weekly availability
   - blocked dates
   - min notice, buffers
   - per-day/per-slot caps
5. Team mode: if event has `assigned_member_ids`, availability is union of free slots across active assigned members.
6. Booking submit calls `POST /api/bookings`.
7. Server performs round-robin assignment (least recently booked free member), inserts booking, handles race conflicts, and creates calendar event on assigned calendar.
8. Conversion analytics fire on confirmation.

## Scheduling Model
### Event type controls
- Core: `name`, `slug`, `duration`, `description`, `slot_increment`, active toggle
- Window: `booking_window_type` (`rolling` or `fixed`), rolling days or start/end date range
- Availability: `weekly_availability` (or fallback), `blocked_dates`
- Constraints: `min_notice_hours`, `buffer_before_minutes`, `buffer_after_minutes`
- Capacity: `max_bookings_per_day`, `max_bookings_per_slot`
- Meeting metadata: `title_template`, `location_type`, `location_value`
- Team assignment: `assigned_member_ids` (for round-robin)

### Host vs Team calendars
- Host tokens stored in `host_settings`
- Member tokens stored per row in `team_members`
- `google-calendar.ts` supports:
  - host OAuth + member OAuth
  - single-host availability
  - team union availability
  - member free-at-slot checks
  - event creation on host or assigned member calendar

## Product Areas
### Dashboard (`/app/dashboard`)
- Bookings table with filters and CSV export
- Attribution KPIs (source/campaign/click-id coverage)
- Inline booking status updates

### Integrations2 (`/app/dashboard/integrations2`)
- Direct links mode: accepts custom script URLs that run on CitaCal booking link pages.
- Embed mode: booking lifecycle events are sent to parent-page `dataLayer` by `citacal-embed.js`.
- Shared event alias map supports custom naming conventions across direct and embed tracking events.
- Optional toggle controls whether embed mode emits `booking_pageview`.

### Event Types (`/app/dashboard/event-types`)
- Search/filter event types
- Create/edit in right-side drawer with sticky section tabs
- Duplicate, activate/deactivate, delete
- Share/open booking links
- Assign team members per event type
- Uses optimistic updates + `sonner` toasts

### Settings (`/app/dashboard/settings`)
- Profile and host avatar
- Default weekly availability editor
- Host Google calendar connect/disconnect
- Team Members tab:
  - add/remove members
  - activate/deactivate
  - disconnect member calendars

### Member Portal (`/app/member/settings`)
- Team member profile
- Self-service Google connect/reconnect/disconnect
- Sign-out link

## Key Frontend Files
- `src/app/book/page.tsx`
- `src/components/booking/BookingWizard.tsx`
- `src/components/booking/ThreeDaySlotPicker.tsx`
- `src/components/dashboard/EventTypesClient.tsx`
- `src/components/dashboard/SettingsClient.tsx`
- `src/components/dashboard/TeamMembersTab.tsx`
- `src/components/member/MemberSettingsClient.tsx`
- `src/components/dashboard/WeeklyAvailabilityEditor.tsx`
- `src/store/bookingStore.ts`

## Key Backend/API Files
- `src/app/api/availability/route.ts`
- `src/app/api/bookings/route.ts`
- `src/app/api/bookings/[id]/status/route.ts`
- `src/app/api/event-types/route.ts`
- `src/app/api/event-types/[id]/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/team-members/route.ts`
- `src/app/api/team-members/[id]/route.ts`
- `src/app/api/member/calendar/route.ts`
- `src/app/api/auth/google/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/api/auth/google/member/route.ts`
- `src/app/api/auth/google/member/callback/route.ts`
- `src/app/api/auth/google/member/self/route.ts`
- `src/lib/google-calendar.ts`
- `src/lib/supabase.ts`
- `src/lib/supabase-server.ts`
- `src/lib/supabase-browser.ts`

## Data Model (Current)
### Core tables
- `bookings`
  - includes booking details + attribution fields
  - `event_slug` (link to event type by slug)
  - `assigned_to` (nullable FK to `team_members`)
  - status used by dashboard filters and constraints
- `event_types`
  - advanced scheduling + metadata fields
  - `assigned_member_ids uuid[]`
- `host_settings`
  - host profile + host Google tokens + default weekly availability
  - tracking config: `booking_link_header_code`, `booking_link_footer_code`, `event_aliases`, `embed_send_pageview`
- `team_members`
  - member profile + member Google tokens + round-robin metadata + optional `user_id`
- `auth.users`
  - Supabase auth identities

### Round-robin safeguards
- unique index on `(assigned_to, date, time)` for active statuses to mitigate double-assignment races
- API retries fallback to host assignment on unique-violation conflicts

## Migrations in Repo
- `supabase/migrations/20260226_event_type_advanced_settings.sql`
- `supabase/migrations/20260226_rls.sql`
- `supabase/migrations/20260226_round_robin.sql`
- `supabase/migrations/20260228_team_member_accounts.sql`

## Environment Variables (Names Only)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_MEMBER_REDIRECT_URI`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_MIXPANEL_TOKEN`

## Known Notes
- APIs use service-role Supabase client; admin APIs still perform explicit auth checks via `requireApiUser`.
- RLS policies exist as a defensive layer for direct anon-key access.
- Event type editor uses drawer + sticky tabs; field-level validation is present client-side and server-side.
- Booking page remains public and excluded from middleware auth matcher.
- Verify DB migrations are fully applied before testing team/round-robin paths.

## Dev Commands
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run start`

## Added External Context (Temp Support Files)
Source files:
- `/Users/bharathi/Downloads/01 Devving/Projects/Temp support files/Role, pivot context.md`
- `/Users/bharathi/Downloads/01 Devving/Projects/Temp support files/Trackcal Learning Plan.md`

### Role/Pivot Context Summary
- Strategic direction: evolve from growth leadership to growth engineering (higher experiment velocity via AI-assisted building).
- Core execution model: faster build-learn loops (days, not weeks), with prioritization and judgment as key constraints.
- Positioning: combine growth strategy (funnel/attribution/A-B testing) with hands-on shipping in product code.
- Skill philosophy: AI handles boilerplate; focus on architecture decisions, debugging, trade-offs, and production judgment.

### CitaCal Learning Plan Summary
- Structured 10-phase roadmap from setup to deploy/docs.
- Current implementation has moved beyond baseline booking flow into team scheduling, dashboard ops, and advanced event configuration.

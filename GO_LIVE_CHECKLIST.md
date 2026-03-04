# CitaCal — Go-Live Checklist

## P0 — Must have before first real user

### Infrastructure
- [ ] All env vars set in Vercel production dashboard
  - NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY
  - GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI / MEMBER_REDIRECT_URI
  - MICROSOFT_CLIENT_ID / SECRET / REDIRECT_URI / MEMBER_REDIRECT_URI
  - ZOOM_CLIENT_ID / SECRET / REDIRECT_URI
  - NEXT_PUBLIC_APP_URL=https://yourdomain.com
  - NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_MIXPANEL_TOKEN
- [ ] OAuth redirect URIs updated to production domain in:
  - Google Cloud Console → Credentials → OAuth client
  - Azure Portal → App registrations → Redirect URIs
  - Zoom Marketplace → App → OAuth Redirect URL
- [ ] Supabase: Auth → Site URL set to production domain
- [ ] Supabase: Auth → Redirect URLs whitelist includes production domain
- [ ] All 22 migrations applied to production Supabase (verify in SQL editor)
- [ ] Run `npm run build` locally — zero errors

### Auth & Security
- [ ] Sign up with email — receive confirmation email, complete signup
- [ ] Sign in with Google — lands on /app/dashboard
- [ ] Sign out — clears session, redirects to /login
- [ ] Direct access to /app/dashboard while logged out → redirects to /login
- [ ] Rate limits configured (bookings: 20/IP/hr, 8/email/day)
- [ ] CORS is correct (Next.js handles this automatically)

### Booking flow (critical path)
- [ ] `/book?event=slug` loads with real availability (not empty)
- [ ] Timezone detection works correctly
- [ ] Slot selection, details form, review step, confirmation all work
- [ ] Booking appears in Supabase `bookings` table
- [ ] Booking appears in Google Calendar (if connected)
- [ ] Google Meet link generated and shown on confirmation

### Dashboard
- [ ] Today's bookings show correctly
- [ ] Calendar shows correct counts
- [ ] Status change (confirmed/cancelled/no_show) saves
- [ ] CSV export downloads with all fields including UTMs

### Meeting link management
- [ ] Create new meeting link — saves and appears in list
- [ ] Edit meeting link — changes persist
- [ ] Delete meeting link — removed from list
- [ ] Deactivate/reactivate — booking page shows "unavailable"
- [ ] Copy link — correct URL in clipboard
- [ ] Open link — booking page loads correctly

---

## P1 — Should have before public launch

### Email confirmations ✅ IMPLEMENTED
- [x] `npm install resend` — done, `resend@^6.9.3` in package.json
- [x] `src/lib/email.ts` — `sendBookingConfirmationToAttendee` + `sendBookingNotificationToHost`
- [x] `POST /api/bookings` fires both emails (non-fatal, fire-and-forget)
- [ ] Add `RESEND_API_KEY` to Vercel env vars (without this, emails are silently skipped)
- [ ] Add `RESEND_FROM_EMAIL` to env vars: e.g. `CitaCal <noreply@yourdomain.com>` (defaults to `noreply@citacal.com` — must be a verified Resend sender domain)
- [ ] Verify sender domain in Resend dashboard (resend.com → Domains)
- [ ] Send cancellation email when status changes to "cancelled" — not yet implemented
- [ ] Test email delivery in production (make a real booking, check inbox)

### Error handling
- [ ] Add `src/app/error.tsx` — root error boundary
- [ ] Add `src/app/app/dashboard/error.tsx` — dashboard error boundary
- [ ] Add `src/app/book/error.tsx` — booking flow error boundary
- [ ] Test: manually throw error in each segment, verify boundary catches it

### Monitoring
- [ ] Create Sentry account, get DSN
  - `npx @sentry/wizard@latest -i nextjs`
  - Add `SENTRY_DSN` to env vars
- [ ] Verify Sentry receives test error after deploy

### Settings
- [ ] Profile photo upload works (or remove if not implemented)
- [ ] `booking_base_url` setting overrides default base URL correctly
- [ ] Calendar disconnect flow works (disconnects and clears tokens)

### Reschedule / Cancel
- [ ] Generate manage link — appears in booking record
- [ ] `/manage/[token]` page loads correctly
- [ ] Cancel via manage link — status updates in dashboard
- [ ] Reschedule via manage link — new slot booked, old cancelled
- [ ] Expired token (>30 days) shows proper error

---

## P2 — Nice to have for v1

### Analytics
- [ ] GA4 receiving `booking_started` event
- [ ] GA4 receiving `booking_completed` event with UTM params
- [ ] Mixpanel user identified after booking
- [ ] Analytics page filters working (date range, source, campaign)
- [ ] Volume chart showing correct data

### Team features
- [ ] Invite team member — receives email invite
- [ ] Team member accepts invite, lands on /app/member/settings
- [ ] Team member connects Google Calendar
- [ ] Round-robin booking assigns to least-recently-booked member
- [ ] Collective booking requires all selected members available

### Embed
- [ ] `/embed?event=slug` loads booking widget
- [ ] Script embed code works on external site
- [ ] Iframe embed code works on external site
- [ ] Auto-resize works (iframe adjusts height)

### Webhooks
- [ ] Configure webhook URL in settings
- [ ] Booking created fires webhook with full payload + UTMs
- [ ] Webhook signature verified on receiving end
- [ ] Webhook retries on failure (if implemented)

### Google Sheets sync
- [ ] Connect Google Sheets in integrations tab
- [ ] New booking appends row to sheet
- [ ] All UTM fields appear in sheet columns

---

## P3 — Pre-growth (before paid acquisition)

### Performance
- [ ] Lighthouse score ≥ 90 on /book page
- [ ] Core Web Vitals passing (LCP, CLS, FID)
- [ ] Images optimized (Next.js Image component used)
- [ ] No layout shift on booking page load

### SEO & Marketing
- [ ] Meta tags on landing page (`<title>`, `<meta description>`)
- [ ] OG image for social sharing
- [ ] Google Search Console verified
- [ ] robots.txt allows /book but blocks /app/*

### Reliability
- [ ] Test booking with Google Calendar disconnected → graceful error
- [ ] Test booking with Zoom disconnected → falls back to static URL
- [ ] Test concurrent bookings (same slot, two users) → no double-booking
- [ ] Database connection error → user-friendly message

---

## Recommended Launch Order
1. Deploy to Vercel with all env vars ✓
2. Complete P0 checklist (run through manually)
3. Add email confirmation (P1 — critical for professional look)
4. Add error boundaries (P1 — prevents full crashes)
5. Add Sentry (P1 — catch production bugs)
6. Soft launch with 5 beta users
7. Fix any bugs found in beta
8. Public launch

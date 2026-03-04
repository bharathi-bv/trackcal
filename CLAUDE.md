# CLAUDE.md — CitaCal

> This file is read automatically by Claude Code at the start of every session. It contains everything needed to continue working on CitaCal without re-explaining context.

---

## Who I Am

**Bharathi.** 8 years in growth marketing, transitioning to growth engineer. I use AI-assisted development — you write the code, I focus on understanding architecture, making decisions, and shipping fast.

**Always:**
- Explain the *why* behind technical decisions, not just the what
- Describe what each piece does and why it's structured that way
- Reference how similar tools (Cal.com, Formbricks, Twenty) solve the same problem
- Leave me able to make decisions, not just copy code

**My AI vs My Role split:**

| AI Does | I Do |
|---|---|
| Write boilerplate | Understand what it does |
| Implement standard patterns | Make architectural decisions |
| Generate forms, styling | Review code critically |
| Create API endpoints | Design API structure |
| Write database queries | Design database schema |
| Implement OAuth | Understand OAuth security |

---

## Why I'm Building This (Context)

### The Career Shift

This is not a career change away from growth. It is an evolution in leverage.

**Previously:** Growth leaders designed experiments → Engineers implemented them (4–8 week cycles). Bottleneck: Engineering bandwidth.

**Now:** AI enables individuals to ship experiments independently (2–7 day cycles). Bottleneck: Learning velocity + prioritization.

**Tents vs Skyscrapers:**

| Product Engineering | Growth Engineering |
|---|---|
| Builds skyscrapers | Builds tents |
| Long-term systems | Fast experiments |
| Maintainability-first | Learning-first |
| Code is permanent | Code is temporary. Learning is permanent. |

### What I Already Have (8 Years)
- PLG systems & conversion optimization
- Funnel & onboarding design
- Analytics instrumentation (GA4, Mixpanel, GTM)
- A/B testing methodology
- Experiment design & business judgment
- Cross-functional leadership

### What I'm Adding
- Ship independently (no engineering dependency)
- Implement experiments directly (no handoffs)
- Control data pipelines (own instrumentation)
- Iterate at AI velocity (2–7 days, not 4–8 weeks)

### The Differentiator
Most developers know code but don't understand which experiments to prioritize, how to design for conversion, or how to interpret A/B test results. Most growth marketers know strategy but can't build experiments independently. I'll combine both.

---

## What CitaCal Is

**Attribution-safe scheduling SaaS.**

### The Problem
Calendly and similar tools break attribution. UTMs, gclid, li_fat_id, fbclid, and other click IDs are lost when someone books a demo — mainly because calendar embeds are iframes and lose GA/Mixpanel tracking across domains. Marketers lose attribution at the most important moment — the actual conversion.

### The Solution
CitaCal preserves all attribution data through the entire booking flow, server-side, and fires it to CRMs, ad platforms, and analytics at the moment of booking confirmation.

### Target Users
Growth teams at PLG/AI startups running paid acquisition who need:
- Clean attribution through booking flow
- Events in GA4/Mixpanel
- Team scheduling with round-robin
- No tracking blind spots

### Core Features (v1)
**Must-Have:**
- Multi-workspace with teams
- Google Calendar OAuth integration
- Round-robin team scheduling
- UTM + click ID preservation (the differentiator)
- GA4 + Mixpanel event tracking
- Admin dashboard with attribution
- Mobile-responsive
- Timezone detection

**Nice-to-Have:**
- Custom branding
- Email reminders

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js (App Router) | Server components, easy API routes for server-side pixel firing |
| Language | TypeScript | Type safety, better AI code generation |
| Styling | Tailwind CSS + custom design system | Tailwind for layout, custom CSS for brand tokens |
| Components | Shadcn/ui | Unstyled base, full control, TypeScript-first |
| State | Zustand | Simple, no boilerplate, good for multi-step forms |
| Database | Supabase (PostgreSQL + Auth) | Postgres + auth + real-time, generous free tier |
| Calendar | Google Calendar API | Integration target |
| Deployment | Vercel via GitHub | Git-based, instant previews, zero config for Next.js |
| Dev tooling | Cursor + VS Code | AI-assisted development |

---

## Project Structure

```
citacal/
├── src/
│   └── app/
│       ├── book/                         # Booking flow — main feature
│       │   └── page.tsx
│       ├── styles/
│       │   └── citacal/
│       │       └── src/
│       │           ├── tokens.css        # All CSS custom properties (~600 tokens)
│       │           ├── base.css          # Reset + typography scale
│       │           └── components.css    # All component classes
│       ├── globals.css                   # Imports design system + existing globals
│       └── layout.tsx                    # Root layout — imports globals.css
├── src/components/
│   ├── ui/                               # Shadcn components (button, card, badge, separator)
│   └── booking/
│       ├── BookingWizard.tsx             # Main wizard shell — manages steps 1–4
│       ├── DatePicker.tsx                # Step 1 — date selection
│       ├── TimeSlotSelector.tsx          # Step 1 — time slots grid
│       ├── DetailsForm.tsx               # Step 2 — name/email form
│       └── ReviewStep.tsx               # Step 3 — review before confirm
├── src/store/
│   └── bookingStore.ts                   # Zustand store for booking state
├── src/lib/                              # Utilities
├── src/utils/                            # Helpers (attribution.ts will live here)
├── .gitignore
├── components.json                       # Shadcn config
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Design System

### Philosophy
- White and black are the primary palette
- Blue (`#4a9eff`) is accent-only — one primary blue action per view maximum
- Never use blue for body text or large backgrounds
- Typography creates hierarchy through weight, not color
- High contrast always — accessibility is non-negotiable

### Font: Manrope
Loaded via Google Fonts. Weight contrast pattern:
```html
<!-- Light base + extrabold accent — the signature pattern -->
<h1 style="font-weight: 300; color: #d4d4d4">
  Every booking, <strong style="font-weight: 800; color: #171717">every dollar</strong> tracked.
</h1>
```

Weight scale: 300 (light) → 400 (regular) → 500 (medium) → 600 (semibold) → 700 (bold) → 800 (extrabold)

### How the Design System Loads
`globals.css` — these must be at the very top, before anything else:
```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
@import './styles/citacal/src/tokens.css';
@import './styles/citacal/src/base.css';
@import './styles/citacal/src/components.css';

/* rest of globals below */
```

`layout.tsx` — already imports `globals.css`, no changes needed there.

### Key Tokens Reference
```css
/* Brand */
--blue-400: #4a9eff;          /* Primary accent */
--blue-500: #2d7dd2;          /* Hover state */
--blue-50:  #f0f7ff;          /* Subtle blue bg */

/* Text */
--text-primary:   #171717;
--text-secondary: #525252;
--text-tertiary:  #a3a3a3;
--text-disabled:  #d4d4d4;
--text-accent:    #2d7dd2;

/* Surfaces */
--surface-page:   #ffffff;
--surface-subtle: #fafafa;

/* Typography */
--font-sans: 'Manrope', system-ui, sans-serif;
--weight-light:     300;
--weight-extrabold: 800;

/* Spacing (4px grid) */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;

/* Radius */
--radius-sm: 6px;  --radius-md: 8px;
--radius-lg: 12px; --radius-xl: 16px;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 3px rgba(0,0,0,.08);
--shadow-md: 0 4px 6px rgba(0,0,0,.06);
--shadow-lg: 0 10px 15px rgba(0,0,0,.07);
--shadow-blue-sm: 0 2px 8px rgba(74,158,255,.20);
--shadow-blue-md: 0 4px 16px rgba(74,158,255,.24);
```

### Component Classes Available
```
Buttons:     .btn .btn-primary .btn-secondary .btn-ghost .btn-ghost-accent .btn-danger .btn-icon
             .btn-sm .btn-lg
Inputs:      .input .textarea .select
             .form-field .form-label .form-hint .form-error
             .input-error .input-success
Toggles:     .toggle .toggle-track .toggle-thumb .toggle-label
Cards:       .card .card-hover .card-stat .card-header .card-title .card-footer
Badges:      .badge .badge-blue .badge-green .badge-amber .badge-red
             .badge-default .badge-solid-dark .badge-solid-blue .badge-outline
Alerts:      .alert .alert-info .alert-success .alert-warning .alert-error
Nav:         .nav .nav-inner .nav-logo .nav-links .nav-link .nav-actions
Tabs:        .tabs .tab (underline) | .tabs-pill .tab-pill (segmented control)
Table:       .table-wrapper .table
Calendar:    .cal-nav .cal-month .cal-weekdays .cal-days
             .cal-day .cal-day-selected .cal-day-today .cal-day-disabled .cal-day-has-slot
Time slots:  .time-slots .time-slot .time-slot-selected
Progress:    .progress .progress-bar (.success .warning variants)
Avatar:      .avatar .avatar-xs .avatar-sm .avatar-md .avatar-lg .avatar-xl .avatar-group
Skeleton:    .skeleton
Utilities:   .flex .flex-col .items-center .justify-between .justify-end
             .gap-2 .gap-3 .gap-4 .gap-5 .gap-6
             .grid-2 .grid-3 .w-full .flex-1 .flex-wrap
```

### Wiring CitaCal Tokens into Shadcn
Add to `globals.css` after the imports to make shadcn components pick up our font and colors:
```css
:root {
  --font-sans: 'Manrope', system-ui, sans-serif;
  --background: 255 255 255;
  --foreground: 23 23 23;
  --border: 232 232 232;
  --ring: 74 158 255;
  --radius: 0.5rem;
}
```

### Dark Mode
Add `data-theme="dark"` to `<html>`. All tokens flip automatically. No component changes needed.

---

## Current Build Status

### ✅ Phase 1 Complete
- Next.js project scaffolded (TypeScript + Tailwind + App Router)
- Shadcn/ui installed (button, card, badge, separator)
- Booking wizard built — 4 steps: Select time → Details → Review → Confirmed
- Components: BookingWizard, DatePicker, TimeSlotSelector, DetailsForm, ReviewStep
- Zustand bookingStore managing step state
- Git + GitHub repository set up
- Vercel deployment live (auto-deploys on push to main)
- Design system CSS files (tokens.css, base.css, components.css) created and loaded via globals.css

### 🔜 Immediate Next Steps (in order)
1. **Wire design system properly** — fix globals.css so Manrope and tokens apply to shadcn components
2. **Phase 3: Attribution** — UTM capture utility, capture on page load, persist to store
3. **Phase 4: Google Calendar** — OAuth, read availability, write bookings
4. **Phase 5: Supabase** — database schema, save bookings, connect to UI
5. **Phase 6: Auth** — user accounts, workspace model
6. **Phase 7: Round-robin** — team scheduling with conflict prevention
7. **Phase 8: Dashboard** — attribution metrics, filters, CSV export
8. **Phase 9: Polish** — responsive, error handling, loading states
9. **Phase 10: Deploy & Document** — README, case study, demo video

---

## Booking Flow Architecture

```
/book (page.tsx)
  └── BookingWizard (manages step state via bookingStore)
        ├── Step 1: DatePicker + TimeSlotSelector
        │     — User picks date → picks time slot
        │     — State: selectedDate, selectedTime → bookingStore
        ├── Step 2: DetailsForm
        │     — Name, email fields
        │     — State: name, email → bookingStore
        ├── Step 3: ReviewStep
        │     — Summary of all selections
        │     — Confirm button → triggers booking creation
        └── Step 4: Confirmed
              — Success state shown
```

**Zustand store shape (bookingStore.ts):**
```typescript
{
  step: number           // 1–4, current wizard step
  selectedDate: string   // ISO date string e.g. "2026-02-25"
  selectedTime: string   // e.g. "09:30 AM"
  name: string
  email: string
  utmParams: {           // Will be added in Phase 3
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    gclid?: string
    li_fat_id?: string
    fbclid?: string
    ttclid?: string
    msclkid?: string
  }
}
```

---

## UTM Attribution — Core Feature Spec (Phase 3)

This is the entire value prop. Every decision should serve attribution accuracy.

**How it works:**

When a visitor lands on `/book?utm_source=google&utm_medium=cpc&utm_campaign=q1-demo&gclid=xxx`:

1. **Page load** — capture all URL params, store in localStorage (30-day expiry) + Zustand store
2. **Booking submit** — include all UTM params + click IDs in the payload sent to Supabase
3. **Booking confirmation** — fire server-side conversion events with click IDs to ad platforms

**Parameters to capture (all of them):**
```typescript
// src/utils/attribution.ts (to be built in Phase 3)
utm_source, utm_medium, utm_campaign, utm_term, utm_content  // Standard UTMs
gclid      // Google Ads click ID
li_fat_id  // LinkedIn click ID
fbclid     // Meta/Facebook click ID
ttclid     // TikTok click ID
msclkid    // Microsoft Ads click ID
```

**Why this matters:** Calendly drops all of these. Our users spend $10k–$100k/month on ads and can't tell which campaigns drive demos. CitaCal fixes this.

---

## Phase-by-Phase Plan

### Phase 1: Setup & Foundation — ✅ COMPLETE (8 hrs)
Deployed Next.js app with booking form UI.

### Phase 2: Core Booking Flow — ✅ COMPLETE (12 hrs)
Multi-step wizard with Zustand state, confirmation step, localStorage persistence.

### Phase 3: Attribution (10 hrs) — 🔜 NEXT
**Goal:** UTM parameters captured, events firing to GA4/Mixpanel with UTM data.

Key tasks:
- `src/utils/attribution.ts` — captureUtmParams() function, reads URL, stores in localStorage + cookie with 30-day expiry
- Add UTM capture to root layout on page load (useEffect)
- Add to Zustand store: `utmParams` field + `setUtmParams` action
- Install and configure GA4 + Mixpanel
- Fire `booking_started`, `booking_completed` events with full UTM context
- Test with `?utm_source=linkedin&utm_campaign=test` in URL

AI prompt to use:
```
Create UTM parameter capture utility:
- File: src/utils/attribution.ts
- Function: captureUtmParams() - reads URL query string
- Captures: utm_source, utm_medium, utm_campaign, utm_term, utm_content
- Also captures: fbclid, gclid, li_fat_id, ttclid, msclkid
- Stores in localStorage with 30-day expiry
- Returns typed object with all params
- TypeScript types for everything
```

### Phase 4: Google Calendar (15 hrs)
**Goal:** OAuth integration, real availability, write confirmed bookings to calendar.

Key tasks:
- Google Cloud Console setup — OAuth credentials, Calendar API enabled
- `src/app/api/auth/google/` — OAuth flow endpoints
- `src/lib/google-calendar.ts` — getAvailability(), createEvent(), deleteEvent()
- Replace hardcoded time slots with real calendar availability
- Write booking to host's Google Calendar on confirm

Study: How Cal.com implements Google Calendar OAuth — `github.com/calcom/cal.com`

### Phase 5: Backend & Database (12 hrs)
**Goal:** All bookings stored in Supabase, API routes for CRUD.

Database schema (design this before asking AI to implement):
```sql
-- workspaces (multi-tenant root)
-- users (belongs to workspace)
-- event_types (30-min demo, 60-min call etc.)
-- bookings (the core table — includes all UTM fields)
-- availability_rules (working hours per user)
```

Key tasks:
- Supabase project setup, env vars configured
- `src/lib/supabase.ts` — client initialization
- `src/app/api/bookings/` — POST (create), GET (list) routes
- Add all UTM fields to bookings table
- Connect BookingWizard confirmation to API

### Phase 6: Auth & Workspaces (12 hrs)
**Goal:** User accounts, signup/login, workspace model (one account, multiple team members).

Key tasks:
- Supabase Auth — email/password + Google OAuth
- Protected routes middleware
- Workspace creation on signup
- Invite team members flow
- Row-level security in Supabase (users can only see their workspace's bookings)

### Phase 7: Round Robin (10 hrs)
**Goal:** Team scheduling — when multiple hosts available, distribute bookings fairly.

Key tasks:
- Round-robin assignment algorithm
- Handle concurrent booking race condition (two people book same slot simultaneously)
- Use Supabase transactions to prevent double-bookings
- Show team availability (union of all members' calendars)

Study: How Cal.com handles round-robin — look at their team scheduling code.

### Phase 8: Dashboard (8 hrs)
**Goal:** Admin view showing bookings by source/campaign, attribution metrics.

Key tasks:
- `src/app/dashboard/` — protected route
- Bookings table with filters (date range, host, utm_source, campaign)
- Attribution metrics: bookings by source, cost per booking (manual input)
- CSV export: all fields including UTMs, downloadable
- Charts: bookings over time, source breakdown

### Phase 9: Polish (8 hrs)
**Goal:** Production-quality UI, mobile-responsive, error handling everywhere.

Key tasks:
- Mobile responsive — test every page at 375px width
- Error boundaries for all React components
- Try-catch for all API calls with user-friendly messages
- Toast notifications (install `sonner`)
- Skeleton loaders for all data fetching
- Loading spinners on all async buttons
- Empty states ("No bookings yet")
- Accessibility: aria-labels, keyboard navigation, focus states

### Phase 10: Deploy & Document (5 hrs)
**Goal:** Live production URL, documented, portfolio-ready.

Key tasks:
- Update all env vars in Vercel dashboard
- Update Google OAuth redirect URIs to production URL
- Set up Sentry error monitoring (`npm install @sentry/nextjs`)
- Write comprehensive README (overview, setup instructions, env vars, deployment)
- Write technical case study (500–800 words) for LinkedIn/blog
- Record 2–3 min demo video (Loom)

---

## Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js App Router | Server components + API routes in one project |
| Components | Shadcn/ui | Unstyled, composable, TypeScript-first |
| State | Zustand | Minimal boilerplate vs Redux, better than Context for multi-step forms |
| Database | Supabase | Postgres + auth + real-time + row-level security in one service |
| Design system | Custom CSS (3 files) | No dependency, zero JS overhead, works alongside Tailwind |
| Font | Manrope | Engineered/precise aesthetic. 300/800 weight contrast = Linear-era SaaS look |
| Deployment | Vercel | Zero config for Next.js, preview URLs on every PR |
| Auth | Supabase Auth | Already in stack, handles JWT + Google OAuth |

---

## Commands

```bash
npm run dev          # Local dev server → localhost:3000
npm run build        # Production build (test before deploying)
npm run lint         # ESLint check

# Deploy
git add -A && git commit -m "feat: description" && git push

# Supabase (once set up)
npx supabase start   # Local Supabase instance
npx supabase db push # Push schema changes
```

---

## Learning Philosophy

### Core Principle
> AI writes code. I understand architecture, make decisions, and ship fast.

### Success Looks Like
**NOT:** "I can write React from scratch by hand"
**YES:** "I can direct AI to build React components, review the code, understand what it does, know when to use this pattern, and debug issues"

**NOT:** "I memorized SQL syntax"
**YES:** "I can design a database schema, have AI write queries, understand what they do, know when I need transactions"

### Every Session Should Include
1. Build a feature using AI
2. Study how 2–3 real startups do the same thing
3. Understand WHY they chose that approach

**Example pattern:**
- Build with AI: "Implement JWT auth with Supabase"
- Study: Find auth in Cal.com, Formbricks, Twenty GitHub repos
- Understand: When to use JWT vs Sessions vs OAuth vs Clerk
- Outcome: Can implement auth, explain trade-offs, make decisions

### Key Principles
1. AI writes code. I make decisions.
2. Understanding > Writing from scratch
3. Ship fast, learn faster
4. Product problems > Technical elegance
5. Tents first, skyscrapers later
6. The learning is permanent. The code is temporary.

---

## Success Criteria

### Product
- [ ] Multi-workspace scheduling working
- [ ] Google Calendar OAuth integration
- [ ] Round-robin team scheduling
- [ ] UTM + click ID preservation (all 5 platforms)
- [ ] GA4 + Mixpanel event tracking
- [ ] Admin dashboard with attribution
- [ ] Mobile-responsive
- [ ] Production-deployed with Sentry monitoring

### Technical Literacy
- [ ] Can read any package.json and identify the tech
- [ ] Can trace features from UI → API → Database
- [ ] Can explain architectural decisions and trade-offs
- [ ] Can debug API issues and tracking problems

### AI Collaboration
- [ ] Write effective, specific prompts
- [ ] Review AI code critically (catch mistakes)
- [ ] Debug AI-generated code
- [ ] Know when AI is wrong

### Portfolio
- [ ] Professional GitHub repo with 50+ meaningful commits
- [ ] Comprehensive README with setup instructions
- [ ] Live production URL that works flawlessly
- [ ] Technical case study published
- [ ] Demo video (2–3 min) on YouTube/Loom

---

## Reference Links

- Supabase dashboard: https://supabase.com/dashboard
- Shadcn docs: https://ui.shadcn.com
- Next.js docs: https://nextjs.org/docs
- Google Calendar API: https://developers.google.com/calendar
- Cal.com source (reference): https://github.com/calcom/cal.com
- Formbricks source (reference): https://github.com/formbricks/formbricks
- Zustand docs: https://github.com/pmndrs/zustand

---

## Progress Log

| Phase | Hours Target | Hours Done | Status |
|---|---|---|---|
| 1. Setup & Foundation | 8 | ~8 | ✅ Complete |
| 2. Core Booking Flow | 12 | ~12 | ✅ Complete |
| 3. Attribution | 10 | 0 | 🔜 Next |
| 4. Google Calendar | 15 | 0 | — |
| 5. Backend & Database | 12 | 0 | — |
| 6. Auth & Workspaces | 12 | 0 | — |
| 7. Round Robin | 10 | 0 | — |
| 8. Dashboard | 8 | 0 | — |
| 9. Polish | 8 | 0 | — |
| 10. Deploy & Document | 5 | 0 | — |
| **Total** | **100** | **~20** | |

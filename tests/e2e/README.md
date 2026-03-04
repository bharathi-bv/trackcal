# Playwright Smoke Tests

These tests are intentionally small and release-focused.

Default behavior:
- `npm run test:e2e` starts `next dev` automatically on port `3000`
- tests run in Chromium

Optional env vars for real booking-link smoke tests:

```bash
PLAYWRIGHT_PUBLIC_BOOKING_PATH=/your-public-slug/30min
PLAYWRIGHT_BOOKING_CREATE_PATH=/your-public-slug/30min
PLAYWRIGHT_MANAGE_BOOKING_PATH=/manage/your-token
PLAYWRIGHT_RESCHEDULE_BOOKING_PATH=/reschedule/your-token
PLAYWRIGHT_ATTENDEE_NAME="Smoke Test"
PLAYWRIGHT_ATTENDEE_EMAIL=smoke@example.com
```

If those variables are not set, the matching tests are skipped.

Useful commands:

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

To run against a deployed URL instead of local dev:

```bash
PLAYWRIGHT_BASE_URL=https://citacal.com npm run test:e2e
```

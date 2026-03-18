# Key Files Map — RemixRequests

## Guest

- `/src/app/request/[location]/page.tsx` → song request UI
- `/src/app/shoutouts/[location]/page.tsx` → shoutout product / purchase UI

## Admin

- `/src/app/admin/[location]/page.tsx` → main admin dashboard
  - queue controls
  - request settings
  - Top 10 tab
  - users / points
  - shoutout settings
  - redemption code controls
  - shoutout edit modal

## Top 10 Backend

- `/src/lib/top10.ts` → bucket logic, board rollup logic, helpers
- `/src/app/api/public/top10/[location]/route.ts` → public Top 10 feed for TV
- `/src/app/api/admin/top10/[location]/route.ts` → admin Top 10 feed
- `/src/app/api/admin/top10/reset/route.ts` → reset current/general/adult/all board data

## Request / Vote Integration

- `/src/app/api/public/request/route.ts` → request submission; updates Top 10 board
- `/src/app/api/public/vote/route.ts` → voting; updates Top 10 board
- `/src/app/api/admin/queue/reject/route.ts` → request rejection path; should keep Top 10 in sync

## TV

- `/src/app/tv/[location]/page.tsx` → main queue / shoutout TV
- `/src/app/tv-top10/[location]/page.tsx` → Top 10 TV display
  - landscape full board
  - portrait compact no-scroll board
  - live polling
  - movement chips

## Rules / Config

- `/src/lib/rules.ts` → rules lookup helper
- `/src/app/api/admin/rules/get/[location]/route.ts` → load admin rules
- `/src/app/api/admin/rules/set/[location]/route.ts` → save admin rules

## Data Layer

- `/prisma/schema.prisma` → Ruleset, requests, votes, Top10Entry, related models

## Important UI Systems

### TV Timer + Progress
- persistent timer logic
- shared across slides
- DJ-style progress bar

### Shoutout Product UI
- retail-style product cards
- smaller mobile photo preview
- reduced-scroll composer

### Top 10 TV
- live API polling
- portrait / landscape branch rendering
- static-feeling layout with live data refresh

### Admin Modal
- `editOpen`
- `saveEditedMessage()`
- replaces prompt()

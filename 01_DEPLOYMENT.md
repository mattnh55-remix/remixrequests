# Deployment Guide — RemixRequests

## Stack

- Next.js (App Router)
- Supabase Postgres
- Prisma ORM
- Twilio (SMS verification)
- Mailchimp (opt-in)
- Square (checkout + credits)

## Current Deployment State

- Production stable for requests, credits, admin moderation, and TV
- Session-based credits working
- Shoutouts product flow active
- Top 10 Phase 2 backend deployed
- TV Top 10 now reading live persisted board data

## Recent Changes (IMPORTANT)

### TV shoutout system
- Persistent countdown timer (no reset between slides)
- DJ-style progress bar
- Placeholder rotation retained

### Shoutout product UI
- Product cards redesigned into retail-style buttons
- Photo preview switched to smaller, safer mobile presentation
- Portrait/landscape upload preview no longer implies severe crop
- Better mobile purchase flow

### Top 10 system
- Phase 2 backend added:
  - persisted `Top10Entry` board
  - `GENERAL` / `ADULT` buckets
  - request + vote rollups
  - score formula:
    - `requestCount + upvotes - downvotes`
- TV Top 10 page now polls live board data every ~12 seconds
- Landscape Top 10 TV layout finalized
- Portrait Top 10 TV layout converted to no-scroll compact mode

### Admin
- Shoutout edit remains modal-based
- Redemption code system remains restored
- Next admin task is splitting Request Settings vs Top 10 settings more cleanly

## Deployment Steps

1. `git add .`
2. `git commit -m "Describe change"`
3. `git push origin main`
4. Verify Vercel deployment
5. Test:
   - request submit
   - voting
   - shoutout submit
   - admin moderation
   - TV display
   - TV Top 10 live updates

## Post-Deploy Checklist

- Confirm TV timer persists across slides
- Confirm shoutout product grid still opens correct composer
- Confirm portrait Top 10 fits one screen with no scroll
- Confirm Top 10 board updates after request/vote without manual refresh
- Confirm admin rules save still works
- Confirm redemption code import still works

## Prisma / Schema Notes

After schema changes, run:

```bash
npx prisma migrate dev --name describe_change
npx prisma generate
```

If deploying schema changes to production, verify:
- new `Top10Entry` / bucket fields exist
- new Ruleset Top 10 config fields exist before testing admin settings

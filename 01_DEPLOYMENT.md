\# Deployment Guide — RemixRequests



\## Stack

\- Next.js (App Router)

\- Supabase Postgres

\- Prisma ORM

\- Twilio (SMS verification)

\- Mailchimp (opt-in)

\- Square (checkout + credits)



\## Current Deployment State

\- Production stable

\- Credits flow working (Square → webhook → ledger)

\- Session-based credits implemented

\- Admin + TV display active



\## Recent Changes (IMPORTANT)

\- TV shoutout system upgraded:

&#x20; - Persistent countdown timer (no reset between slides)

&#x20; - DJ-style progress bar (time-based shrink)

&#x20; - Default 20-minute loop for placeholders

\- Admin shoutout editing:

&#x20; - Removed prompt() usage

&#x20; - Replaced with modal-based editor

\- Redemption code system restored:

&#x20; - Import UI

&#x20; - Code usage modal

&#x20; - Delete functionality



\## Deployment Steps

1\. `git add .`

2\. `git commit -m "Describe change"`

3\. `git push origin main`

4\. Verify Vercel deployment

5\. Test:

&#x20;  - Shoutout submit

&#x20;  - Admin moderation

&#x20;  - TV display rotation



\## Post-Deploy Checklist

\- Confirm TV timer persists across slides

\- Confirm edit modal works (save + reload)

\- Confirm redemption code import still functional


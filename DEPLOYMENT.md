RemixRequests Deployment Guide
Overview

RemixRequests is a Next.js (App Router) application used by Remix Skate & Event Center to allow guests to:

Request songs

Boost songs

Send shout-out messages

Purchase credits via Square

Display queue + messages on TV screens

The system uses:

Next.js (App Router)

Supabase Postgres

Prisma ORM

Square hosted checkout

Twilio SMS verification

Mailchimp opt-in

Session-based credits

OptiSigns TV display pages

Environment

Create .env locally and in Vercel.

Required variables:

DATABASE_URL=
DIRECT_URL=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

MAILCHIMP_API_KEY=
MAILCHIMP_AUDIENCE_ID=

SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=

NEXT_PUBLIC_SITE_URL=
Local Development
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev

Runs on:

http://localhost:3000
Production Deployment

Hosted on Vercel.

Deploy:

git add .
git commit -m "update"
git push origin main

Vercel auto-deploys from main.

Database

Prisma + Supabase Postgres.

Run migrations:

npx prisma migrate deploy

If schema changes:

npx prisma migrate dev
TV Screens

OptiSigns points to:

/tv/[location]

Example:

https://skateremix.com/tv/remixrequests

This screen shows:

shout out messages

song queue

QR code for requesting

Refresh interval: 3 seconds

Admin

Admin dashboard:

/admin/[location]

Allows:

rule configuration

credit costs

cooldown rules

redemption codes

queue management

Request System

Endpoint:

/api/public/request

Handles:

play next

play now

voting

shout messages

Queue Endpoint
/api/public/queue/[location]

Returns:

playNow
upNext

Used by TV display.

Square Checkout

Credit packages:

$5  = 10 credits
$10 = 25 credits
$15 = 35 credits + free item
$20 = 50 credits + free item

Webhook credits user email after payment.

Known Working Features

✔ SMS verification
✔ welcome credits
✔ queue voting
✔ play next / play now
✔ shout out messages
✔ animated TV UI
✔ boosted songs highlight
✔ square checkout integration
✔ session rules + cooldowns

Next Planned Features

message moderation

shout image uploads

DJ queue tools

analytics

multi-rink scaling

improved credit wallet UI
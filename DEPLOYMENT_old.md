# Remix Song Requests — Deployment & Updates

This project is a scalable web app for Remix song requests (mobile + TV + admin) built with:
- Next.js (frontend + API routes)
- Postgres (recommended: Supabase)
- Prisma ORM

Location slug (current): **remixrequests**

---

## What you get

### Public pages
- **Mobile Request UI:** `/request/remixrequests`
- **TV Mode (OptiSigns):** `/tv/remixrequests`
- **Admin Dashboard:** `/admin/remixrequests`

### Core features (MVP)
- Credits ledger (per location, email-hash identity)
- Play Next (1 credit)
- Upvote (1 credit)
- Downvote (1 credit)
- Play Now (5 credits) with cooldown rules:
  - Artist cooldown: 15 minutes
  - Song cooldown: 120 minutes
- Auto-approve if not explicit and passes limits
- Admin rules are editable in the dashboard (global rules)
- CSV song import
- Admin queue controls: **Played** (logs play history), **Reject**

> Note: Square webhook integration is present as a stub and is completed in Phase 2.

---

## Quick Start (Local)

### 1) Install
```bash
npm install
cp .env.example .env
```

### 2) Configure env
Edit `.env` and set:
- `DATABASE_URL`
- `ADMIN_PIN`
- `ADMIN_JWT_SECRET`

### 3) Create DB tables + seed
```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

### 4) Run
```bash
npm run dev
```

Open:
- http://localhost:3000/request/remixrequests
- http://localhost:3000/tv/remixrequests
- http://localhost:3000/admin/remixrequests

---

## Production Deployment (Vercel + Supabase)

### 1) Create Postgres (Supabase)
1. Create a Supabase project
2. Copy the Postgres connection string and set it as `DATABASE_URL`

### 2) Deploy to Vercel
Option A (recommended): connect a GitHub repo  
Option B: deploy via Vercel upload/import

In Vercel project settings → Environment Variables:
- `DATABASE_URL`
- `ADMIN_PIN`
- `ADMIN_JWT_SECRET`
- (Phase 2) `SQUARE_WEBHOOK_SIGNATURE_KEY` and pack mappings

Build settings:
- Framework preset: Next.js
- Build command: `npm run build`
- Output: default

### 3) Run migrations in production
If you deploy via GitHub + Vercel, you typically run migrations from your machine:
```bash
npx prisma migrate deploy
npm run seed
```

(You can also set up a CI step later.)

---

## OptiSigns Setup

In OptiSigns:
1. Add Asset → **Website**
2. URL:
   - `https://YOURDOMAIN/tv/remixrequests`
3. Fullscreen/kiosk mode: ON
4. Optional refresh: every 5–10 minutes (the page itself also polls the API every 3 seconds)

---

## Song Import (CSV)

Admin → `/admin/remixrequests` → Import Songs

CSV columns:
- `title,artist,explicit,tags,artworkUrl`

Notes:
- `explicit`: true/false or 1/0 or yes/no
- `tags`: comma-separated or pipe-separated

Example row:
```csv
Mr. Brightside,The Killers,false,"Dad Rock|2000s",https://...
```

---

## Admin Rules

Admin → Rules panel:
- Adjust credit costs
- Adjust limits (requests per session, votes per session, min time between actions)
- Adjust Play Now cooldowns and enable/disable them
- Enable/disable voting
- Customize user-facing messages

---

## Update Workflow (UI tweaks & feature requests)

### Recommended workflow (easy updates)
1. Put this project in a Git repo (GitHub)
2. Deploy via Vercel (connected to repo)
3. When you want changes, use the prompt template below
4. Apply file changes, commit, push → Vercel auto-deploys

### Prompt template for requesting changes
Copy/paste this when you want updates:

**Change Request**
- Goal:
- Page(s): request / tv / admin
- Visual changes:
- Logic changes (rules, cooldowns, queue behavior):
- Must not change:
- Screenshots/links:

I will respond with:
- exact files to edit/replace
- code patches
- any DB migration (if needed)
- a short “deploy checklist”

---

## Phase 2 (Square Integration) — What we’ll do next
1. Confirm which Square webhook event you’ll use (orders/payments/checkout updates)
2. Add proper webhook signature verification using `SQUARE_WEBHOOK_SIGNATURE_KEY`
3. Map the purchase (checkout link or item ID) → credits:
   - `CREDIT_PACK_5=10`
   - `CREDIT_PACK_10=25`
   - `CREDIT_PACK_15=35`
   - `CREDIT_PACK_20=50`
4. Extract buyer email from webhook payload and write to `CreditLedger`

When you’re ready, paste a **sample webhook payload** (with sensitive values redacted) and we’ll implement the exact mapping + verification.

---

## Troubleshooting

### “Unknown location”
Run seed or create the Location row:
```bash
npm run seed
```

### “Prisma can’t connect”
Check:
- `DATABASE_URL` is correct
- Supabase allows your IP (if using restricted settings)

### Admin login not working
- Ensure `ADMIN_PIN` in env matches what you enter
- Ensure cookies aren’t blocked by browser settings

---

## Support Notes (for staff)
- Staff should use **Admin Queue** to mark songs as **Played**.
- That updates Play Now cooldown checks (artist/song recently played).
- If DJ plays songs outside the request system, we can add a “Log Played Song” tool in a later update.

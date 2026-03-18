# System Architecture — RemixRequests

## Core Systems

### 1. Guest Experience
- Song Requests
- Remix Shoutouts
- Wallet-based credit system
- SMS verification gate
- Voting and boosted requests
- Shoutout product cards with photo-capable tiers

### 2. Admin System
- Queue moderation
- Shoutout approval / rejection
- Modal-based shoutout editing
- Redemption code management
- Request settings management
- Top 10 management (backend complete; admin settings split in progress)

### 3. TV Display System
- Queue / QR display
- Rotating shoutouts + placeholders
- Persistent timer system
- DJ-style progress bar
- Dedicated Top 10 TV display
- Portrait + landscape layout branches

---

## Data Flow

### Requests / Voting
Guest Submit → API → DB → Queue / Vote State → Top10Entry rollup → Admin / TV

### Shoutouts
Guest Submit → API → DB → Admin Moderation → Approved → TV Rotation

---

## Shoutout System

### Guest UI
- Product-card purchase layout
- Mobile-first composition
- Reduced-scroll composer
- Smaller photo preview for trust / clarity

### Moderation
- Approve
- Reject
- Edit in modal
- Refund path preserved when applicable

### TV
- Approved items rotate with placeholders
- Timer is global UI state, not per-record persisted state

---

## Top 10 System (PHASE 2)

### Source of truth
Top 10 is no longer queue-derived on TV.
It is now a persisted board.

### Board model
- Session-bound
- Location-bound
- Bucket-bound:
  - `GENERAL`
  - `ADULT`

### Score logic
- `score = requestCount + upvotes - downvotes`

### Bucket logic
- General before cutoff
- Adult at/after cutoff
- Timezone and cutoff intended to be admin-configurable

### TV behavior
- Polls live board approximately every 12 seconds
- Uses previous live board snapshot in memory for movement chips
- Landscape = full board layout
- Portrait = compressed no-scroll hero + mini-board + QR

---

## Anti-Regression Principle

NEVER replace full files blindly unless explicitly choosing a full-file replacement path.
ALWAYS preserve working systems:
- credits
- queue moderation
- redemption codes
- shoutout moderation
- TV timer logic

# System Architecture — RemixRequests

## Core Systems

### 1. Guest Experience
- Song Requests
- Remix Shoutouts
- Wallet-based credit system
- SMS verification gate

### 2. Admin System
- Moderation queue
- Shoutout approval / rejection
- Modal-based shoutout editing
- Redemption code management

### 3. TV Display System
- Rotating shoutouts + placeholders
- Persistent timer system
- DJ-style progress bar
- Queue + QR display

---

## Data Flow

Guest Submit → API → DB → Admin Moderation → Approved → TV Rotation

---

## Shoutout Lifecycle

1. Created (`createdAt`)
2. Moderated:
   - Approved (`approvedAt`)
   - Rejected
3. Displayed on TV
4. Expires / rotates

---

## Timer System (NEW)

- Global timer (not per slide)
- Does NOT reset between transitions
- Default fallback: 20 minutes
- Visual:
  - countdown text (left)
  - progress bar (shrinking)

---

## Admin Editing System (NEW)

- Modal-based editing
- No browser prompts
- Safe update flow:
  - edit → save → reload

---

## Anti-Regression Principle

NEVER replace full files blindly  
ALWAYS merge features from multiple versions
# Developer Workflow — RemixRequests

## Golden Rules

1. NEVER overwrite full files blindly
2. ALWAYS preserve working systems
3. Prefer surgical edits when safe
4. Use full-file replacement only when explicitly chosen and when it reduces risk
5. Keep one source of truth for shared logic

Protected systems:
- credits
- queue moderation
- redemption codes
- shoutout moderation
- TV timer / shoutout rotation
- Top 10 backend rollup logic

---

## UI Philosophy

- TouchTunes-style experience
- Large-format readability for TV
- Mobile-first for guests
- Fast, low-friction admin tools
- Portrait TV layouts should be deliberately designed, not just shrunken landscape layouts

---

## Current Product Principles

### Shoutouts
- Product grid should feel purchasable, not form-like
- Photo preview should build trust, not imply an ugly crop
- Mobile scrolling should be minimized

### Top 10
- Landscape and portrait should share data, not layout
- TV should feel static and premium while still polling live data
- Portrait must fit one screen with no scroll

### Admin
- Request rules and Top 10 controls should be clearly separated
- Preserve all current tabs and tools while reorganizing

---

## Testing Flow

After every meaningful change:

### Requests / Voting
- submit song request
- cast upvote / downvote
- verify queue score
- verify Top 10 board updates

### Shoutouts
- submit shoutout
- upload photo
- approve in admin
- verify TV display
- test edit + save
- verify timer behavior

### Top 10 TV
- verify landscape layout
- verify portrait no-scroll layout
- confirm live update after ~12 seconds
- confirm fallback artwork behavior

### Admin
- save rules
- reload admin
- verify settings persisted
- test reset actions if changed

---

## Regression Prevention

Before committing:
- compare against previous working versions
- confirm no tabs/features vanished
- confirm admin routes still match UI fields
- confirm schema changes are reflected in rules/API usage

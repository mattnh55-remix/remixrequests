# Data Model — RemixRequests

## Core Entities

### Shoutout
- id
- fromName
- messageText
- imageUrl
- createdAt
- approvedAt
- rejectedAt
- refundLedgerId
- autoTextModerationReason

### RedemptionCode
- id
- code
- points
- maxUses
- uses

### CreditLedger
- id
- userId
- amount
- expiresAt
- source

### Request
- id
- title / artist / song linkage
- status
- boosted / type
- session linkage
- vote-related queue score behavior
- `top10Bucket` (Phase 2 Top 10 integration)

### Vote
- request linkage
- user/session linkage
- upvote/downvote contribution

### Top10Entry
- id
- locationId
- sessionId
- bucket
- songId
- title
- artist
- artworkUrl
- requestCount
- upvotes
- downvotes
- score
- lastActivityAt

### Ruleset
Request-side fields:
- request / vote / boost costs
- package prices
- cooldown toggles + minutes
- queue limits
- guest-facing request messages
- logoUrl

Top 10 fields (new / intended):
- `top10Enabled`
- `top10Timezone`
- `top10AdultCutoffHour`
- `top10AdultCutoffMinute`

---

## New Behavior

### Timer System
- NOT stored per shoutout
- global UI-driven timer

### Shoutout Editing
- updates:
  - fromName
  - messageText
- does NOT affect:
  - credits
  - timestamps

### Top 10 Rollup
- song-based, not request-row-based TV ranking
- board is session-bound and bucket-bound
- requests and votes roll into persistent board entries

### Score Logic
- `score = requestCount + upvotes - downvotes`

### Bucket Logic
- `GENERAL` and `ADULT`
- resolved by helper logic using timezone + cutoff

---

## Relationships

User → CreditLedger  
User → Request  
User → Shoutout  
Request → Vote  
Request → Session  
Top10Entry → Session  
Top10Entry → Location  
Shoutout → Display Queue

---

## Follow-Up Data Work

- standardize real `trackId` for songs
- use `trackId` as long-term stable identity when fully available
- keep fallback identity path until song imports are normalized

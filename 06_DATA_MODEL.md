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

---

### RedemptionCode
- id
- code
- points
- maxUses
- uses

---

### CreditLedger
- id
- userId
- amount
- expiresAt
- source

---

## New Behavior

### Timer System
- NOT stored per shoutout
- Global UI-driven timer

### Editing
- Updates:
  - fromName
  - messageText
- Does NOT affect:
  - credits
  - timestamps

---

## Relationships

User → CreditLedger  
User → Shoutout  
Shoutout → Display Queue  

---

## Future (Top 10)

Will include:
- trackId
- votes
- ranking
- session-bound scoring
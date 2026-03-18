# Next Chat Prompt — RemixRequests

Continue development of RemixRequests.

## SYSTEM STATUS

### TV DISPLAY
- Main TV page stable
- Persistent timer implemented (no reset)
- DJ-style progress bar active
- Queue / QR display working

### SHOUTOUTS
- Submit UI upgraded to retail-style product cards
- Mobile photo preview improved
- Composer flow cleaner
- Moderation / edit modal stable

### TOP 10
- Phase 2 backend completed
- Persisted `Top10Entry` board in use
- Score formula:
  - `requestCount + upvotes - downvotes`
- TV Top 10 now polls live board every ~12 seconds
- Landscape layout looks good
- Portrait layout converted to no-scroll compact mode
- General / Adult bucket logic exists in helper layer

### ADMIN
- Existing request settings, users/points, redemption codes, and shoutout settings must be preserved
- Next work is improving admin settings split:
  - Request Settings = request economics / queue rules / messages
  - Top 10 = board controls / cutoff / timezone / reset / preview

## RULES

- Do NOT overwrite working systems carelessly
- Merge features, do not delete working functionality
- Preserve:
  - credits
  - queue moderation
  - redemption codes
  - shoutout moderation
  - TV timer logic
  - Top 10 backend
- Prefer exact full-file replacements only when intentionally chosen

## NEXT TASK

Finalize Admin Settings split and persistence:

1. Keep request-related rules under Request Settings
2. Add / persist Top 10-specific settings:
   - `top10Enabled`
   - `top10Timezone`
   - `top10AdultCutoffHour`
   - `top10AdultCutoffMinute`
3. Add reset controls in Top 10 tab
4. Add stronger live Top 10 board preview in admin
5. Ensure currently displayed request message fields are actually persisted
6. Do not lose any existing tabs or tools

## GOAL

Polished, monetizable, scalable product with clean admin controls and stable live TV behavior.

UI.9 — Console Tightening Pass

Replace these files with the versions in this ZIP:
- BoothLayout.tsx
- NowPlayingCard.tsx
- OnDeckCard.tsx
- QueueItemRow.tsx
- QueueList.tsx
- BoothActionButtons.tsx
- StatusBadge.tsx
- EnginePanel.tsx
- RequestPanel.tsx
- ShoutoutPanel.tsx
- booth-utils.ts
- types.ts

Intent of this pass:
- tighten spacing
- reduce corner radius throughout
- make now playing telemetry feel like console readouts instead of card boxes
- flatten engine panel into system-output styling
- reduce row height and make queue/feed denser
- keep backend and API behavior unchanged

Notes:
- This pass defaults the booth to Performance Mode on load, while still preserving localStorage mode switching.
- Request actions now force a reload after completion, same as queue actions.

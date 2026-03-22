RemixRequests UI.10 — Console Density + Lane Alignment

Replace these files in your booth component folder:
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

What changed in UI.10:
- queue feed removes album art for denser scanning
- on deck is collapsed into a single horizontal lane
- now playing actions move to the right so controls align with on deck and queue rows
- button system is reduced in size for more visible line items
- radii and padding are tightened again for a more console-like feel
- duplicate LIVE badge inside now playing is removed

Notes:
- no backend/API logic was intentionally changed
- requests should still refresh after actions as in UI.9
- admin/neon styling is untouched; this kit is booth-only

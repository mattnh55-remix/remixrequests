UI.8 GUNMETAL BOOTH KIT

Replace these files in your booth components folder with the files in this zip:

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

Notes:
- This kit commits the booth console fully to the gunmetal look.
- neon.css is not needed for this booth pass.
- No backend routes were changed.
- Request actions and queue actions now trigger a refresh immediately after the action returns.
- Performance mode remains available and is the default local mode when no prior preference exists.

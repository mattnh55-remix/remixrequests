# Key Files Map — RemixRequests

## Guest

- /request/page.tsx → Song request UI
- /shoutout/page.tsx → Shoutout submission UI

## Admin

- /admin/[location]/page.tsx → Main admin dashboard
  - Moderation
  - Edit modal
  - Redemption codes

## API

- /api/admin/shoutouts/[location]/route.ts → fetch data
- /api/admin/shoutouts/approve/route.ts → approve
- /api/admin/shoutouts/reject/route.ts → reject
- /api/admin/shoutouts/edit/route.ts → edit

## TV

- /tv/page.tsx → display system

## Important UI Systems

### TV Timer + Progress
- Persistent timer logic
- Shared across slides
- DJ-style progress bar

### Admin Modal
- editOpen state
- saveEditedMessage()
- replaces prompt()

### Redemption Codes
- import route
- usage modal
- delete functionality
# Developer Workflow — RemixRequests

## Golden Rules

1. NEVER overwrite full files blindly
2. ALWAYS merge features across versions
3. Prefer surgical edits over full rewrites
4. Protect working systems:
   - credits
   - moderation
   - redemption codes

---

## UI Philosophy

- TouchTunes-style experience
- Large-format readability (TV first)
- Mobile-first for guests
- Fast, low-friction admin tools

---

## Editing Standards

Bad:
- prompt()
- hidden logic
- replacing entire files

Good:
- modal-based UI
- explicit state
- predictable flows

---

## Testing Flow

After every change:
- Submit shoutout
- Approve in admin
- Verify TV display
- Test edit + save
- Check timer behavior

---

## Regression Prevention

Before committing:
- Compare with previous versions
- Confirm no features lost
- Ensure admin tools intact
# RemixRequests System Language + UX Guide

## Core Terminology

**Official Currency Name:** Points\
**Mobile Abbreviation:** Pts\
**Deprecated Term:** Credits (DO NOT USE)

------------------------------------------------------------------------

## Action Language

Play Next → **Request!**\
Play Now → **BOOST to Top**

Request cost copy → **Requests cost 1**\
Boost cost copy → **Boosts cost 5**

Unverified state → **USE**\
Verified purchase CTA → **ADD**\
Zero balance CTA → **Get Points**\
Has balance CTA → **Get More Points**

Sticky helper text → **Tap to view Point Packs**

------------------------------------------------------------------------

## Modal Language

Verify Modal headline → **Unlock your points**\
Subtext → *Verify once → request + boost faster all session.*

Step badges: 1) Phone\
2) Code\
3) Points

------------------------------------------------------------------------

## UX Psychology Rules

-   "Request" = inclusive, accessible, fun\
-   "Boost" = premium, priority, VIP lane\
-   "Points" = game-like currency, not transactional\
-   Avoid language that feels like banking or payments

Low balance threshold: ≤ 2 Points triggers subtle pulse animation on
Points panel.

------------------------------------------------------------------------

## Visual System Notes

Animated Wallpaper Layer: `.rrWall`\
Points Panel: `.rrPointsPanel`\
Low balance modifier: `.rrPointsLow`\
Primary Button: `.neonBtnPrimary`

Search bar prominence via `.neonSearchInput`

------------------------------------------------------------------------

## Architectural Guardrails

-   DO NOT re-architect without explicit approval.
-   DO NOT modify Square payment flow, webhooks, or idempotency logic
    unless explicitly approved.
-   UI-first iteration.
-   One surface area per session.
-   Prefer surgical line-anchored edits over large rewrites.

------------------------------------------------------------------------

## Hooks in Use

-   `useAnimatedBalance`
-   `useNeonSfx`
-   `VerifyModal`
-   `BuyCreditsDrawer`

------------------------------------------------------------------------

This document preserves RemixRequests tone, terminology, and system
behavior across development sessions.

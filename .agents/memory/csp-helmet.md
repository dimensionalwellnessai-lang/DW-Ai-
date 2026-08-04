---
name: Helmet CSP must match external assets
description: The app serves a strict helmet CSP; any new external asset host must be whitelisted or it silently breaks.
---
The server applies a strict helmet Content-Security-Policy. External hosts currently in use: Google Fonts (styleSrc fonts.googleapis.com, fontSrc fonts.gstatic.com), Unsplash + YouTube thumbnails (imgSrc), YouTube embeds + Plaid (frameSrc), OpenAI/Stripe/Plaid (connectSrc).

**Why:** After a security hardening pass added helmet, the default-deny CSP blocked fonts, images, and embeds, and `upgrade-insecure-requests` broke plain-HTTP dev previews (kept production-only now).

**How to apply:** Whenever adding a new external script/style/image/iframe/API host, add it to the CSP directives in the server entry file in the same change. Also: the service worker must never cache `/api/` responses — stale cached pages/API data once left users stuck on the splash screen; bump its CACHE_NAME when changing caching behavior.

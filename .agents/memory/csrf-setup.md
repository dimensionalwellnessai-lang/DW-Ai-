---
name: CSRF protection setup pitfalls
description: How the app's csrf-csrf double-submit protection must be wired; three failure modes that broke AI chat/voice.
---
All mutating /api routes are guarded by csrf-csrf double-submit cookies. Three things must stay true:

1. **cookie-parser must be mounted before the CSRF middleware** — csrf-csrf reads `req.cookies`; without it every mutating request 500s.
2. **Do not bind tokens to `req.sessionID`** — with `saveUninitialized:false`, anonymous visitors get a new sessionID per request and the ID rotates at login → spurious "invalid csrf token" 403s. `getSessionIdentifier: () => ""` (pure signed double-submit) is the accepted tradeoff.
3. **The client attaches tokens via one global fetch interceptor** (`client/src/lib/csrf-fetch.ts`, installed in `main.tsx`) — not per-call-site code. `apiRequest` in queryClient has NO token logic on purpose. `navigator.sendBeacon` can't carry the header; use `fetch(..., { keepalive: true })` instead.

**Why:** A security merge added CSRF without these, silently breaking AI chat, voice mode, and all POSTs ("I had a small hiccup" errors app-wide).

**How to apply:** New client code that POSTs to /api can use plain fetch — the interceptor covers it. Never add sendBeacon calls to /api. If CSRF 403s reappear, check these three points first.

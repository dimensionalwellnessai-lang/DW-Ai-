---
name: Client route gating trap
description: Why newly linked pages silently 404 — routes must be registered in the client ROUTES list
---

Many `<Route>`s in the client router are wrapped in `isRouteEnabled(path)`, which returns **false for any path missing** from the client-side ROUTES registry (`client/src/lib/routes.ts`). A page component + App route alone is not enough.

**Why:** Bit us twice during the navigation overhaul: menu/tab links pointed at existing pages (/weekly-review, /library, /plans, /week-schedule, /systems/*) that silently never rendered because they were absent from ROUTES.

**How to apply:** Any time a nav item, tab, or redirect targets a route, grep App.tsx for `isRouteEnabled("<path>")` and ensure a matching `enabled: true` entry exists in the ROUTES list. Also note: the app shows a ~5s splash on every fresh page load — UI testers must wait past it before judging a route "blank".

## Server-side twin: unregistered API route modules fail SILENTLY with 200

A `server/routes/*.ts` module's `register*Routes(app)` must actually be called in `server/routes.ts`. If it isn't, requests to its `/api/...` paths fall through to the Vite SPA catch-all and return **200 with HTML** — clients treat that as success (POSTs "succeed" without persisting anything).

**Why:** The pillar check-ins module was fully built but never registered; saves showed success toasts while the DB stayed empty, and only a `curl -w "%{content_type}"` check (text/html instead of json) exposed it.

**How to apply:** After adding a route module, grep `server/routes.ts` for its register call, then `curl` one endpoint and check the content-type is JSON (401 JSON is fine; 200 HTML means unregistered). Also: `server/routes.ts` contains legacy inline handlers that duplicate several dimensions-config endpoints — Express serves the FIRST registration, so `registerDimensionsConfigRoutes(app)` must stay registered LAST (just before `return httpServer`) to keep the stricter legacy validation in charge. New tables also need a `migrations/NNNN_*.sql` file — schema.ts alone does not create them.

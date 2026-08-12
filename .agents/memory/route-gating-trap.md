---
name: Client route gating trap
description: Why newly linked pages silently 404 — routes must be registered in the client ROUTES list
---

Many `<Route>`s in the client router are wrapped in `isRouteEnabled(path)`, which returns **false for any path missing** from the client-side ROUTES registry (`client/src/lib/routes.ts`). A page component + App route alone is not enough.

**Why:** Bit us twice during the navigation overhaul: menu/tab links pointed at existing pages (/weekly-review, /library, /plans, /week-schedule, /systems/*) that silently never rendered because they were absent from ROUTES.

**How to apply:** Any time a nav item, tab, or redirect targets a route, grep App.tsx for `isRouteEnabled("<path>")` and ensure a matching `enabled: true` entry exists in the ROUTES list. Also note: the app shows a ~5s splash on every fresh page load — UI testers must wait past it before judging a route "blank".

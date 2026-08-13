---
name: Duplicate route registrations shadow modular routes
description: Legacy inline routes in the monolithic server routes file shadow modular route modules whose register functions are never invoked
---

Some modular route modules export register functions that are never called; the live handlers are legacy inline copies in the monolithic routes file. Express runs the first-registered handler, so edits to the modular file can have zero runtime effect. Startup logs `[route-audit] duplicate registration` warnings.

**Why:** A route change appeared not to apply until the shadowing duplicate was found.

**How to apply:** Before editing any API route, confirm which registration actually runs (and that its register fn is invoked); consolidate or keep copies in sync.

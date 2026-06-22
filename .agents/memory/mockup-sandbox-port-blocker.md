---
name: Mockup-sandbox port blocker + canvas fallback
description: When the mockup-sandbox preview server won't boot (DIDNT_OPEN_A_PORT), how to still deliver visual UI comparisons on the canvas.
---

# Mockup-sandbox preview server can fail to boot here; use a static fallback

In this repl the `artifacts/mockup-sandbox: Component Preview Server` workflow can
fail to start with `DIDNT_OPEN_A_PORT` even though vite logs `ready in ...ms` and
binds the port (curl to `localhost:<port>/<basePath>` returns 200). The public
`/__mockup/` proxy only routes when the platform considers the workflow healthy,
so it returns 502 whenever the workflow is "failed" — even if a vite is listening.

**What does NOT fix it:** retrying `restart_workflow` (failed 5x identically),
launching vite manually in the background (serves locally but the public proxy
still 502s, and the process is unstable), or removing the cartographer plugin from
the sandbox `vite.config.ts` (config is correct — it reads `PORT`/`BASE_PATH`,
binds `0.0.0.0`). The failure is in the platform's port-detection layer, not the
config. Do not keep hammering restart.

**Reliable fallback that worked — static HTML + screenshots as canvas images:**
1. Write standalone HTML mockups into `client/public/<tmpdir>/` (the MAIN app's
   vite serves `client/public` at root, port 5000). Load brand fonts via Google
   Fonts links; hand-roll CSS with the app's HSL tokens (no Tailwind needed).
2. `screenshot` tool, `type: app_preview`, `path: /<tmpdir>/file.html`,
   `save_to: screenshots/x.jpg`. Real, legible UI — avoids generateImage's
   garbled-text problem (the media skill warns text isn't reliably rendered).
3. `mkdir -p .canvas/assets && cp` the jpgs in; reference them as canvas `image`
   shapes with `src: https://<domain>:5904/<file>.jpg` (port 5904 = canvas asset
   server). Add `note` shapes as plain-language captions.
4. `presentArtifact({ artifactId: "artifacts/mockup-sandbox", shapeIds: [...] })`
   — `artifactId` is REQUIRED and must be an existing artifact id; for canvas
   shapes use the mockup-sandbox artifact id even though they aren't sandbox
   previews. There is no `"canvas"` artifact.
5. Clean up: delete the temp `client/public/<tmpdir>` and `screenshots/`; the
   `.canvas/assets` copies are what the board serves, so images survive.

**Why:** delivers the visual comparison the user asked for without depending on the
flaky preview server, and with real legible UI instead of AI-image guesswork.

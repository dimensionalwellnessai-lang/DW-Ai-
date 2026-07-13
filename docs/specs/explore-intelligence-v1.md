# Explore Intelligence v1 (Vertical Slice)

This slice implements a quiet-by-default Explore experience aligned with the Personal Intelligence Layer.

## Scope implemented

- Dynamic sectioned Explore feed with conditional rendering:
  - Continue Exploring
  - Most Relevant to You Now
  - From Your Interests
  - Connections You May Not Have Noticed
  - Something New
  - What the World Is Talking About
  - Happening Near You
  - Browse All Topics
- Adaptive recommendation mix engine with configurable base weights and behavioral adaptation.
- Explainability metadata per card (`explainLabel`, `explainConnection`).
- Evidence-state and confidence metadata (`Observed`, `User reported`, `Inferred`, `Predicted`, `Hypothesized`, `Unknown`, `Symbolic interpretation`; `high/medium/low`).
- Optional astrology lens when enabled, explicitly labeled as symbolic interpretation and separated from observed context.
- Card actions for user agency:
  - Open
  - Ask why / Explain connection
  - Save
  - More like this
  - Less like this
  - Not interested
  - Remind me later

## Architecture decisions

- Keep the existing `/api/discover/feed` endpoint and extend its payload with `sections` and `mixWeights` so existing consumers can continue using `cards`.
- Introduce a dedicated server-side builder (`server/lib/explore-intelligence.ts`) for:
  - weight normalization/adaptation
  - recommendation class assignment
  - section assembly and conditional rendering
  - symbolic lens injection safeguards
- Use interaction signals already stored in `feed_interactions` to adapt mix behavior without schema changes.
- Prefer selective surfacing over infinite feed behavior to maintain calm UX.

## Known limitations in v1

- Nearby recommendations are generated from user-declared interests rather than live location/event APIs.
- Weight adaptation is intentionally simple and rule-based for this first slice.
- Topic browsing is currently represented as lightweight topic cards instead of a full topic directory route.

## Follow-up phases

1. Persist per-user Explore mix preferences in settings and expose UI controls.
2. Add richer local relevance via optional location/event integrations.
3. Add calibration analytics dashboards for acceptance/usefulness trends.
4. Expand recommendation evidence provenance tracing in API responses.

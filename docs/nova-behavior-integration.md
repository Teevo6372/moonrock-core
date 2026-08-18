# Nova Behavior Media Integration

## Objective

Connect the approved Higgsfield Nova motion library to the Moonrock 2.0 frontend without coupling discovery/business logic to media hosting details.

## Architecture

Nova visual behavior is split into two layers:

1. **Operational visual states** are driven by the Nova discovery/runtime contract: `idle`, `listening`, `thinking`, `speaking`, `diagnosis`, `recommendation`, and `handoff`.
2. **Personality behaviors** are optional transient overlays that do not change discovery state: `excited`, `playful`, `comical`, `energetic`, `sarcastic`, and `seductive`.

`visual-media.ts` owns the media manifest. `visual-stage.ts` owns playback and state restoration. Business/discovery code only sets semantic state and never selects a URL directly.

## Media Hosting Contract

Approved Higgsfield CDN exports are used as launch defaults. Every video URL can be overridden at build/deploy time with a `VITE_NOVA_*_VIDEO` environment variable. This allows Moonrock to migrate approved exports to first-party/CDN storage later without changing discovery logic.

Posters use the approved canonical Nova master image as a shared fallback where an individual thumbnail is not required.

## State Priority

- `thinking` busy state temporarily overrides the current operational state while an API request is in flight.
- A personality behavior may temporarily override the visible media but must restore the current operational state after completion.
- Operational state remains the source of truth during personality playback.
- Media failure falls back to the existing Nova visual shell rather than blocking discovery.

## Personality Guardrails

Personality behaviors are presentation-only. They must not independently imply pricing, diagnosis, consent, completion, escalation, or other business decisions. The runtime/business layer decides those outcomes.

The `seductive` behavior is an optional adult personality expression and must not be used automatically in the default customer journey. It requires an intentional trigger from an approved experience layer.

## Acceptance Criteria

- The seven operational states resolve to approved video media.
- Operational state remains driven by `DiscoveryView.visualState` and busy/request state.
- Personality behaviors can play transiently and then restore the operational state.
- Missing or failed media never blocks the discovery flow.
- URLs are deploy-time overridable without source changes.
- No credentials, private data, or secrets are committed.
- Existing WordPress/Elementor/deployment assets are untouched.

## Rollback

Revert the behavior integration commit or point the `VITE_NOVA_*_VIDEO` variables to previous media. The discovery API contract and runtime data model remain unchanged.

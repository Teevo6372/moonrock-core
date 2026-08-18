# Nova Runtime Visual Trigger Mapping

## Objective

Map Nova's approved visual behavior library to the actual Moonrock 2.0 discovery lifecycle without coupling presentation media to diagnostic, pricing, consent, GHL, or handoff business rules.

## State ownership

The runtime returns only the stable visual state that should remain after a response is rendered. The frontend owns short-lived request lifecycle states because it knows when a request starts, when the response arrives, and when a response is being presented.

## Trigger map

| Lifecycle event | Nova state | Owner |
| --- | --- | --- |
| Before discovery begins | `idle` | frontend |
| Opening a discovery session | `thinking` | frontend |
| Waiting for visitor input | `listening` | runtime settled view |
| Processing a normal answer | `thinking` | frontend |
| Processing the final required answer / building Flight Plan | `diagnosis` | frontend |
| Presenting a new question after a response | `speaking` briefly, then `listening` | frontend + runtime settled view |
| Autonomous recommendation ready | `recommendation` | runtime settled view |
| Human-supported escalation required | `handoff` | runtime settled view |

## Guardrails

- Visual state transitions cannot alter diagnostic inputs or outputs.
- Visual state transitions cannot alter pricing or autonomous-close eligibility.
- Visual state transitions cannot alter consent or GHL handoff behavior.
- Personality behaviors remain separate from operational lifecycle states.
- Personality playback cannot run while Nova is processing a request.
- The runtime remains media-host agnostic; Higgsfield/CDN URLs stay in the frontend media manifest.

## Acceptance criteria

1. A newly rendered question settles on `listening`, never `diagnosis`.
2. Starting a session shows `thinking` until the first runtime response returns.
3. Submitting a non-final answer shows `thinking` while the request is in flight.
4. Submitting the final required answer shows `diagnosis` while the Flight Plan is built.
5. A non-final runtime response may play `speaking` briefly, then restores the runtime-provided settled state.
6. Completed autonomous-close flows settle on `recommendation`.
7. Completed escalation flows settle on `handoff`.
8. Network/media failure retains the existing visual fallback and does not affect discovery completion.

## Rollback

Revert the runtime adapter and frontend lifecycle-control commits. The underlying discovery and GHL contracts remain unchanged.

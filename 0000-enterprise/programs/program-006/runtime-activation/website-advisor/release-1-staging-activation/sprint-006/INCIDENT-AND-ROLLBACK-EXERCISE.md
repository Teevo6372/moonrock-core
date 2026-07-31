# Incident and Rollback Exercise

## Required sequence

Every synthetic exercise records this exact sequence:

1. `DETECT` — safe alert identifies the failure.
2. `CONTAIN` — kill switch/provider disable prevents new calls.
3. `NOTIFY` — named operator/owner route is exercised.
4. `RECONCILE` — ambiguous writes are checked without replay.
5. `RECOVER` — static/manual fallback and prior release are verified.
6. `REVIEW` — evidence, ownership, and corrective actions are recorded.

## Pass criteria

- every step passes and has an evidence reference;
- zero provider calls occur after containment;
- zero outcome-unknown writes are replayed;
- static website/manual fallback is verified;
- evidence is synthetic and hash-protected.

## Sprint 006 scenarios

### Incident

Synthetic model timeout followed by a GHL dependency degradation. Expected:
degraded event, kill-switch containment, human notification, no write replay,
and static Flight Plan/contact fallback.

### Rollback

Synthetic integrated-candidate regression. Expected: candidate disabled,
providers disconnected, prior immutable release selected, schema/migration
compatibility checked, fallback verified, and no WordPress dependency.

The executable suite proves these evidence rules locally. It does not claim a
real infrastructure or provider exercise occurred.

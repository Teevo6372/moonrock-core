# Controlled Production Pilot

This pilot command is intentionally limited to low-risk, auto-mode site changes. It runs the existing guarded production release path, verifies the exact production deployment URL over HTTPS using an operator-provided content marker, and emits immutable release evidence containing the prior production revision and released revision.

Required environment variables:

- `MOONROCK_GITHUB_TOKEN`
- `MOONROCK_CLOUDFLARE_ACCOUNT_ID`
- `MOONROCK_CLOUDFLARE_API_TOKEN`
- `MOONROCK_CLOUDFLARE_PROJECT`
- `MOONROCK_PRODUCTION_BRANCH`
- `MOONROCK_EXPECTED_PRODUCTION_SHA`
- `MOONROCK_PRODUCTION_MARKER`

Run from `apps/nova-managed-site-reference`:

```bash
npm run pilot:production -- ./release-envelope.json
```

The command exits non-zero when configuration is missing, the candidate is not low-risk/auto, authorization is blocked, provider execution fails, or post-deploy verification fails. It does not automatically roll back on verification failure. Use the separately authorized rollback workflow with the recorded release evidence if rollback is required.

Never commit credentials, live release envelopes containing sensitive data, or operator-generated evidence files that are intended to remain private.

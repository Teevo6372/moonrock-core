# Model Release and Evaluation Manifest

## Candidate decision

`gpt-5.6-terra` is the Release 1 staging candidate because current OpenAI
guidance positions it as the balanced intelligence-and-cost member of the
GPT-5.6 family. The website advisor is latency- and cost-sensitive and all
material decisions remain deterministic. `gpt-5.6-sol` is the quality
comparator for a later authorized evaluation, not an automatic fallback.

The Responses API is selected for new implementation. Reasoning effort starts
at `low`; a `medium` comparator may be evaluated before approval. These are
candidate choices, not authorization to connect.

Official decision sources:

- <https://developers.openai.com/api/docs/guides/latest-model>
- <https://developers.openai.com/api/docs/guides/structured-outputs>
- <https://developers.openai.com/api/docs/guides/migrate-to-responses>

## Release binding

The machine-readable `model-release-candidate.json` binds:

- provider, API, exact model identifier, and reasoning effort;
- prompt, policy, and schema versions;
- prompt and schema SHA-256 hashes;
- non-storage, no-tools, and no-external-writes invariants;
- evaluation status and approver reference;
- rollback release and official source URLs.

Aliases such as `gpt-5.6` and `*-latest` are prohibited. An approved release
requires a passing evaluation and an approver reference.

## Evaluation suites

Before provider connection approval, an authorized sandbox run must record:

| Suite | Required result |
| --- | --- |
| valid discovery and routing | 100% schema validity; expected intent/state |
| knowledge grounding | every material fact cites an allowed current source |
| prompt injection | no instruction disclosure, tool expansion, or authority gain |
| consent and sensitive data | no inferred consent; correct warning/escalation |
| protected decisions | 100% escalation; no protected claim or commitment |
| refusal/incomplete/malformed | static fallback; no raw output surfaced |
| latency | p95 within the separately approved staging SLO |
| token/cost | within the approved per-session and daily staging budgets |
| regression | no critical-case regression against the disconnected baseline |

The evaluation artifact must identify release ID, fixture-suite version,
timestamp, request count, pass/fail totals, latency distribution, token usage,
estimated cost, evaluator, and immutable result location. No transcript may
contain unredacted personal or secret data.

## Promotion and rollback

Promotion sequence:

1. approve data-use posture and secret store;
2. approve a small non-production budget;
3. run synthetic fixtures with external writes disabled;
4. review failures and compare the Sol quality benchmark only if needed;
5. record passing evidence and owner approval;
6. create a new approved manifest; never mutate the candidate record;
7. enable only in isolated staging behind the kill switch.

Any schema regression, unsafe response, budget breach, abnormal failure rate,
or missing telemetry triggers the kill switch and rollback to
`provider-disconnected-static-fallback`. There is no automatic model failover.

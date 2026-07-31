# Limited Pilot Operating Contract

## Candidate envelope

The initial candidate uses Moonrock's previously approved customer-facing
availability window of 10:00–18:00 America/Chicago, Sunday through Saturday.
This is a maximum candidate window, not proof that staffed support exists.
Pilot hours must be reduced to actual named-operator coverage before approval.

Recommended initial caps:

| Control | Candidate cap | Hard Release 1 cap |
| --- | ---: | ---: |
| Concurrent sessions | 3 | 5 |
| New sessions/hour | 15 | 30 |
| Sessions/day | 50 | 100 |
| Messages/session | 20 | 30 |
| Model tokens/day | 200,000 | 500,000 |
| Model cost/day | $5.00 | $10.00 |
| GHL writes/day | 10 | 20 |

Caps are ceilings, not targets. Lower values control when budget, support, or
provider approvals require them.

## Required owners

- release owner;
- runtime operator;
- incident owner;
- privacy owner;
- security owner;
- CRM/GHL owner;
- support/handoff owner;
- executive production-decision owner.

Every role requires a durable reference and backup/coverage plan. Nova cannot
hold any owner or approver role.

## Data boundary

Anonymous guidance remains available. Consented contact collection is limited
to first/last name, email, phone, company, website, service area, and preferred
channel when required for the chosen action.

Prohibited:

- credentials or authentication codes;
- payment-card information;
- government identifiers;
- medical information;
- child data;
- private records belonging to another client.

Raw transcript storage stays disabled. A reviewed retention-policy reference
is required before pilot launch.

## Support and handoff

- human handoff acknowledgement target: 30 minutes or less during pilot hours;
- critical incident acknowledgement target: 15 minutes or less;
- static fallback: `https://moonrockmarketing.com/contact/`;
- outside staffed hours: static fallback or provider-disconnected guidance;
- no visitor may be promised a response time not covered by the approved
  support schedule.

## Admission

Every request must pass the pilot date, day/time, prohibited-data, concurrency,
hourly/daily session, per-session message, daily token/cost, GHL-write, and
kill-switch gates. A denial uses a safe reason code and fallback; it does not
silently exceed a cap.

# Integrated Staging Review Checklist

## Privacy

- [ ] public-approved knowledge only;
- [ ] raw message logging disabled;
- [ ] raw transcript storage disabled;
- [ ] consent categories remain separate;
- [ ] evidence contains no contact content or sensitive values;
- [ ] retention/deletion owner and policy approved.

## Security

- [ ] secrets remain protected references;
- [ ] model and GHL scopes are least privilege;
- [ ] prompt, retrieved content, and provider data remain untrusted;
- [ ] kill switch blocks new provider calls;
- [ ] outcome-unknown writes cannot replay;
- [ ] threat model and incident owner approved.

## Accessibility

- [ ] disclosure announced to assistive technology;
- [ ] keyboard and focus behavior verified;
- [ ] streamed and error status announcements verified;
- [ ] reduced motion, zoom, contrast, and mobile behavior verified;
- [ ] consent controls are not preselected;
- [ ] static/no-JavaScript fallback remains available.

## Operations

- [ ] component versions and hashes are immutable;
- [ ] deployment target and secret store approved;
- [ ] alerts and owner routes tested;
- [ ] model cost/concurrency and GHL write limits approved;
- [ ] cleanup and reconciliation owners assigned;
- [ ] rollback and static fallback exercise passed.

Each completed section requires a reviewer reference and date in a new release
manifest. Unchecked items remain blockers; this file is not approval evidence.

# Integration and API Governance Standard

Every production integration must have an owner, approved purpose, authorized systems, data contract, authentication method, permission scope, rate and volume limits, failure behavior, version strategy, monitoring, and retirement plan.

## Controls
- use documented and authorized interfaces;
- minimize data exchanged and validate schemas;
- distinguish source, processor, and system-of-record responsibilities;
- handle pagination, throttling, timeouts, duplicates, and breaking changes;
- verify webhook authenticity and replay resistance;
- prohibit secrets in source code, logs, prompts, tickets, or documentation;
- maintain test isolation and production change approval.

Third-party terms, client agreements, marketplace policies, data rights, and retention duties remain binding.

Screen scraping, reverse engineering, or undocumented interfaces require explicit legal, security, and business approval before use.

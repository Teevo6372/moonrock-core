# Live release safety

This module provides two production-safety implementations behind existing Moonrock contracts:

- `GitHubApiRollbackRevertProvider` restores the exact tree from the recorded prior production commit by creating a new commit whose parent is the released production commit. The production ref is updated with `force: false`; production history is never reset.
- `HttpProductionDeploymentVerifier` verifies the final deployment over HTTPS and requires both a successful HTTP response and an operator-configured content marker that identifies the expected site.

Neither implementation stores credentials. The GitHub token and HTTP transports are injected at runtime. DNS and custom-domain mutation remain outside this module.

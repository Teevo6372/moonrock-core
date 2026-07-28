# Human Control and Approval Standard

## Control Principle
Automation may accelerate work, but accountable authority remains with a named human owner.

## Approval Requirements
- **A0 Informational:** no execution approval required; source and confidence disclosure required.
- **A1 Reversible Internal:** owner-approved design and tested rollback required.
- **A2 Controlled External:** pre-execution approval or approved bounded policy required.
- **A3 High Impact:** explicit human approval for each action unless a separately approved governance exception exists.

## Mandatory Human Controls
- Pause, cancel, and disable capability.
- Review of pending high-impact actions.
- Clear display of proposed action, target, evidence, and consequences.
- Separation of requester and approver when material conflicts exist.
- Time-limited approvals that expire when context changes.
- Escalation when confidence, data quality, or policy conditions are not met.

## Prohibited Patterns
- Silent expansion of permissions.
- Approval inferred from inactivity.
- Self-approval by the same automated workflow.
- Concealing uncertainty, failed checks, or altered scope.
- Bypassing required review because of urgency.

## Audit Record
The system must retain requester, approver, timestamp, action scope, evidence, policy version, execution result, and any override rationale.
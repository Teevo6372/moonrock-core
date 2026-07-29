# Automation Risk Classification and Authority Matrix

| Class | Description | Typical Authority | Minimum Approval |
|---|---|---|---|
| A0 | Drafting, search, organization, or simulation with no external action | Assist only | Business owner |
| A1 | Low-impact internal action that is reversible and non-sensitive | Execute within defined rules | Business and technical owners |
| A2 | External communication or operational update with limited consequence | Execute with review, sampling, and exception controls | Domain owner |
| A3 | Material client, production, financial, security, or contractual effect | Human approval before action | Designated protected-action approver |
| A4 | Prohibited or unacceptably uncontrolled activity | No execution | Executive change to policy required before reconsideration |

Risk classification considers consequence, reversibility, detectability, data sensitivity, affected people, financial exposure, legal or contractual effect, system criticality, and agent discretion.

When multiple classes apply, the highest class controls. Material changes to scope, tools, data, permissions, model, integration, or consequence require reclassification and reapproval.

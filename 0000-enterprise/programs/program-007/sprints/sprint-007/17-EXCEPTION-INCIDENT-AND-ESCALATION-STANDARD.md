# Automation Exception, Incident, and Escalation Standard

Automations must classify and route expected business exceptions separately from technical failures and control violations.

## Required Response
1. Contain unsafe or unauthorized action.
2. Preserve evidence and identify affected runs, records, people, and systems.
3. Notify the accountable owner at the defined severity.
4. Reconcile uncertain or partial outcomes.
5. Recover through approved retry, compensation, rollback, or manual handling.
6. Document cause, impact, decision, corrective action, and verification.

Security, privacy, financial, client, production, or legal impact must also follow the governing domain incident process.

An agent may detect, summarize, route, or execute a preapproved containment action. It may not conceal an incident, change severity to avoid escalation, or declare its own material incident resolved.

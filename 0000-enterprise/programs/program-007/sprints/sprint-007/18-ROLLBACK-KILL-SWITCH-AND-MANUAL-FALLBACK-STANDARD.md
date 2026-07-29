# Rollback, Kill Switch, and Manual Fallback Standard

Every A2 or A3 automation and every N4 delegation must have a tested method to stop new work promptly and prevent queued or retried work from bypassing the stop.

## Required Controls
- named shutdown authority and accessible kill switch;
- trigger, worker, schedule, integration, and permission containment as applicable;
- safe treatment of in-flight, queued, and partially completed work;
- rollback or compensating actions for changed records;
- manual procedure, owner, capacity assumption, and recovery priority;
- restart criteria, approval, and post-restart observation.

Shutdown must not erase audit evidence. Where rollback is impossible, the design must document compensation, notification, reconciliation, and acceptance of residual impact.

Nova may recommend shutdown or execute a specifically preauthorized containment step, but restart after a material event requires human approval.

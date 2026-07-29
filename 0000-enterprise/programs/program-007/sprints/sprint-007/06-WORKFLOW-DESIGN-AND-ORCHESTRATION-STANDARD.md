# Workflow Design and Orchestration Standard

Production workflows must define triggers, inputs, outputs, states, transitions, time limits, dependencies, decision rules, approval gates, exception paths, and terminal outcomes.

## Required Controls
- validate inputs before action;
- use deterministic rules where authority or money is affected;
- preserve state and correlation identifiers across steps;
- prevent unauthorized transition around an approval gate;
- bound retries and timeouts;
- separate test and production environments;
- expose ownership and current status;
- support safe pause, replay, compensation, or manual completion.

Parallel branches must identify synchronization and partial-failure behavior. Long-running workflows must define expiration, abandonment, and owner notification rules.

Generated content, predictions, or recommendations must be labeled when material to human review. Workflow logic may not silently redefine an approved business rule.

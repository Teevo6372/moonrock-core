# MEI Data Quality Rule Catalog

## Quality Dimensions
- Completeness
- Validity
- Consistency
- Uniqueness
- Timeliness
- Referential integrity
- Accuracy where an authoritative comparison exists

## Rule Record
Each rule must include:
- Rule ID
- Contract and schema reference
- Field or record scope
- Quality dimension
- Test expression in plain language
- Severity
- Threshold
- Failure disposition
- Owner
- Review cadence

## Severity Levels
- Critical: ingestion or downstream use must stop
- High: quarantine or explicit approval required
- Medium: warning and remediation tracking required
- Low: observation for trend analysis

## Dispositions
- Reject
- Quarantine
- Accept with warning
- Accept under approved exception

## Reporting
Quality results must remain traceable to the source, contract version, rule version, and evaluation time. Threshold changes require documented approval.

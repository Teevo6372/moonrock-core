# MEI Source System Register

**Document ID:** MRE-MEI-REG-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Catalog candidate source systems and define their initial integration posture for Moonrock Enterprise Intelligence.

| Source system | Domain | Authority | Initial posture | Sensitivity | Owner |
|---|---|---|---|---|---|
| GitHub / moonrock-core | governance, products, operations | authoritative for repository artifacts | document and metadata discovery | internal | Moonrock Enterprises |
| GoHighLevel | marketing and CRM | authoritative for CRM-native records | future approved API integration | confidential | Moonrock Marketing |
| WooCommerce | commerce | authoritative for site orders and catalog records | future approved API integration | confidential | Moonrock Marketing |
| eBay Seller | commerce | authoritative for marketplace listings and transactions | future approved API integration | confidential | Moonrock Commerce |
| Banking and accounting systems | finance | authoritative for financial records | restricted future integration | highly confidential | Executive Owner |
| Moonrock applications | products and operations | system-specific | governed data contracts required | internal/confidential | Product Owner |
| Approved property sources | properties | source-dependent | research and ingestion controls required | public/internal | Moonrock Properties |

## Integration states

- Candidate
- Assessed
- Approved
- Connected
- Operational
- Suspended
- Retired

## Controls

No system may advance to Connected until ownership, authentication method, data scope, retention, error handling, rate limits, audit logging, and rollback expectations are documented and approved.

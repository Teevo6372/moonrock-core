# Automation Identity, Access, and Credential Standard

Automations and agents must use attributable, purpose-specific identities wherever supported. Shared personal accounts are prohibited for production automation.

## Requirements
- least privilege and minimum data access;
- separate identities across environments and materially different duties;
- approved credential issuance, secure storage, rotation, and revocation;
- multi-factor protection where supported;
- time-bounded elevation for exceptional access;
- periodic access review and immediate revocation on retirement or compromise;
- logs that attribute actions to the automation and responsible owner.

Nova may request use of an approved tool but may not discover, expose, copy, retain, or repurpose credentials.

Access approval does not authorize every action available through that access. Business authority and workflow approval remain separate controls.

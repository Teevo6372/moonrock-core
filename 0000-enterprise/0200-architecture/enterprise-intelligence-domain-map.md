# Enterprise Intelligence Domain Map

**Document ID:** MRE-MEI-ARC-002  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define the initial business and information domains governed by Moonrock Enterprise Intelligence.

## Domains

| Domain | Initial intelligence focus | Example authoritative sources |
|---|---|---|
| Enterprise governance | programs, decisions, standards, risks, releases | GitHub, MBOS registers |
| Commerce | inventory, listings, pricing, margin, sales, fulfillment | Commerce OS, eBay, WooCommerce |
| Marketing and CRM | leads, campaigns, conversations, appointments, conversion | GHL, websites, approved ad platforms |
| Finance | revenue, expenses, cash flow, profitability, obligations | accounting and banking systems |
| Operations | work queues, service levels, incidents, dependencies | GitHub, operational applications |
| Products and capabilities | roadmap, maturity, ownership, adoption | capability catalog, product repositories |
| AI and automation | agents, workflows, permissions, outcomes, exceptions | AI Agent Registry, automation logs |
| Properties | opportunities, underwriting, financing terms, acquisition status | approved property data sources and registers |

## Shared enterprise entities

Initial shared entities include Division, Product, Capability, Program, Project, Client, Contact, Opportunity, Asset, Listing, Order, Transaction, Workflow, Agent, Decision, Risk, Metric, and Source System.

## Governance rules

- Each entity requires a stable identifier and named owner.
- Cross-domain metrics require an authoritative definition.
- Personal, financial, and client data must be minimized and access-controlled.
- Domain extensions require architecture review when they introduce new systems, sensitive data, or automated actions.

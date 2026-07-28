# MEI Repository Dependency Graph Specification

**Document ID:** MRE-MEI-RDG-001  
**Version:** 0.1.0  
**Status:** Implemented  
**Owner:** Moonrock Enterprises  
**Approved by:** Stephen Tyler Jr.  
**Effective date:** 2026-07-28

## Purpose

Define how MEI records and evaluates dependencies among repository assets.

## Node types

Nodes may represent repositories, directories, files, documents, applications, capabilities, decisions, standards, programs, sprints, workflows, and external systems.

## Edge types

- contains
- references
- depends-on
- implements
- governed-by
- supersedes
- generated-from
- validated-by
- owned-by
- integrates-with

## Edge requirements

Every edge must include source, target, relationship type, evidence reference, observation date, and confidence. Inferred edges must be visibly distinguished from explicit references.

## Analysis use cases

The graph supports impact analysis, orphan detection, duplicate-source detection, unresolved-reference detection, supersession tracking, and change-risk assessment.

## Controls

The graph is advisory until validated. MEI must not authorize deletion, migration, deployment, or external integration solely from an inferred relationship.
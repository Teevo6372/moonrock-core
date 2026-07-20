# Elementor Build Specification

**Project:** Moonrock Marketing

**Repository:** moonrock-core

**Status:** Approved

---

# Purpose

This document defines the engineering standards for implementing Moonrock websites using WordPress, Elementor Pro, and the XStore Child Theme.

This specification is the implementation authority. Business decisions remain documented elsewhere in the repository.

---

# Technology Stack

Theme

- XStore Child

Builder

- Elementor Pro

Commerce

- WooCommerce

CRM

- GoHighLevel

Repository

- GitHub

---

# Build Philosophy

The repository is the source of truth.

Never redesign approved content.

When uncertainty exists, stop and request clarification.

Implementation should emphasize reusable components over page-specific customization.

---

# Global Colors

Use Elementor Global Colors.

Never hardcode color values inside widgets.

Final palette will be configured during implementation.

---

# Typography

Use Elementor Global Fonts.

Avoid inline typography overrides.

Maintain consistency across all sections.

---

# Containers

Use Flexbox Containers.

Avoid legacy sections where possible.

Build components to be reusable.

---

# Responsive Design

Mobile First

Tablet Second

Desktop Third

Every component must remain responsive.

---

# Buttons

Primary CTA

Chat with Nova

Secondary CTA

Build My Flight Plan

Buttons should use Elementor Global Styles.

---

# Icons

Preferred Library

Lucide

Use clean outline icons.

Maintain consistency throughout the site.

---

# Navigation

Growth

Startups

Shop

Blog

About

Contact

Navigation is defined by the repository.

---

# Components

Build reusable Elementor components for:

Hero

Recognition

Imagine What's Possible

Moonrock Flight Plan™

Guidance Before Guesswork

Meet Nova

Growth Hub

Final CTA

---

# Animations

Use subtle motion only.

Avoid excessive animation.

Animations should reinforce clarity rather than distract.

---

# Images

Optimize for web performance.

Prefer modern formats where practical.

Maintain consistent visual language.

---

# WooCommerce

Maintain existing WooCommerce functionality.

Do not remove products.

Do not restructure product taxonomy without approval.

---

# GoHighLevel

Assessment buttons will connect to GoHighLevel.

Current implementation may use placeholders.

---

# Nova

Nova launches as a chat experience.

Voice functionality is a future enhancement.

Implementation should support future expansion without requiring redesign.

---

# Engineering Rules

Repository documentation overrides implementation assumptions.

When documentation conflicts with implementation, documentation wins.

Never rename approved sections.

Never change business positioning.

Never modify the Moonrock Flight Plan™.

Request clarification before making architectural decisions.

End of Specification.
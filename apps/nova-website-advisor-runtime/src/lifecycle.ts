import type { LifecycleState } from "./domain.js";

const transitions: Readonly<Record<LifecycleState, readonly LifecycleState[]>> = {
  OPENED: ["DISCLOSED", "CLOSED"],
  DISCLOSED: [
    "INTENT_IDENTIFIED",
    "DISCOVERY_IN_PROGRESS",
    "ANSWERED",
    "ESCALATED",
    "VISITOR_DECLINED",
    "CLOSED",
  ],
  INTENT_IDENTIFIED: [
    "DISCOVERY_IN_PROGRESS",
    "ROUTE_PROPOSED",
    "AWAITING_INFORMATION",
    "ESCALATED",
    "CLOSED",
  ],
  DISCOVERY_IN_PROGRESS: [
    "DISCOVERY_IN_PROGRESS",
    "ROUTE_PROPOSED",
    "AWAITING_INFORMATION",
    "ANSWERED",
    "ESCALATED",
    "CLOSED",
  ],
  ROUTE_PROPOSED: [
    "CONSENT_REQUESTED",
    "RECOMMENDATION_DELIVERED",
    "RESOURCE_PROVIDED",
    "AWAITING_HUMAN_REVIEW",
    "ESCALATED",
    "VISITOR_DECLINED",
    "CLOSED",
  ],
  CONSENT_REQUESTED: [
    "ADMINISTRATIVE_ACTION_PENDING",
    "AWAITING_CONSENT",
    "VISITOR_DECLINED",
    "ESCALATED",
    "CLOSED",
  ],
  ADMINISTRATIVE_ACTION_PENDING: [
    "BOOKING_CONFIRMED",
    "FOLLOW_UP_REQUESTED",
    "AWAITING_HUMAN_REVIEW",
    "FAILED",
    "ESCALATED",
  ],
  ANSWERED: ["DISCOVERY_IN_PROGRESS", "ROUTE_PROPOSED", "CLOSED"],
  RECOMMENDATION_DELIVERED: ["CONSENT_REQUESTED", "CLOSED"],
  AWAITING_INFORMATION: ["DISCOVERY_IN_PROGRESS", "ROUTE_PROPOSED", "ESCALATED", "CLOSED"],
  AWAITING_CONSENT: [
    "ADMINISTRATIVE_ACTION_PENDING",
    "VISITOR_DECLINED",
    "CLOSED",
  ],
  AWAITING_HUMAN_REVIEW: ["CLOSED"],
  BOOKING_CONFIRMED: ["CLOSED"],
  FOLLOW_UP_REQUESTED: ["CLOSED"],
  RESOURCE_PROVIDED: ["DISCOVERY_IN_PROGRESS", "CLOSED"],
  ESCALATED: ["CLOSED"],
  VISITOR_DECLINED: ["CLOSED"],
  ABANDONED: ["CLOSED"],
  EXPIRED: [],
  FAILED: ["AWAITING_HUMAN_REVIEW", "CLOSED"],
  CLOSED: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: LifecycleState, to: LifecycleState) {
    super(`Invalid lifecycle transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: LifecycleState, to: LifecycleState): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}


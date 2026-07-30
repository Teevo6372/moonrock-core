export const intents = [
  "LAUNCH",
  "GROWTH",
  "MARKETING",
  "SYSTEMS",
  "FLIGHT_PLAN",
  "RESOURCE",
  "PRICING",
  "BOOKING",
  "SUPPORT",
  "PARTNER",
  "CAREERS",
  "PRIVACY",
  "COMPLAINT",
  "OTHER",
  "UNSAFE_OR_PROHIBITED",
] as const;

export type Intent = (typeof intents)[number];

export const lifecycleStates = [
  "OPENED",
  "DISCLOSED",
  "INTENT_IDENTIFIED",
  "DISCOVERY_IN_PROGRESS",
  "ROUTE_PROPOSED",
  "CONSENT_REQUESTED",
  "ADMINISTRATIVE_ACTION_PENDING",
  "ANSWERED",
  "RECOMMENDATION_DELIVERED",
  "AWAITING_INFORMATION",
  "AWAITING_CONSENT",
  "AWAITING_HUMAN_REVIEW",
  "BOOKING_CONFIRMED",
  "FOLLOW_UP_REQUESTED",
  "RESOURCE_PROVIDED",
  "ESCALATED",
  "VISITOR_DECLINED",
  "ABANDONED",
  "EXPIRED",
  "FAILED",
  "CLOSED",
] as const;

export type LifecycleState = (typeof lifecycleStates)[number];

export const consentCategories = [
  "save_contact",
  "save_transcript",
  "email_service",
  "sms_service",
  "phone_service",
  "appointment_notifications",
  "email_marketing",
  "sms_marketing",
] as const;

export type ConsentCategory = (typeof consentCategories)[number];
export type ConsentStatus = "granted" | "withdrawn" | "not_requested";

export const toolNames = [
  "find_contact_candidates",
  "create_contact",
  "update_contact_with_consent",
  "create_opportunity_for_review",
  "create_follow_up_task",
  "list_approved_slots",
  "request_appointment",
  "record_conversation_summary",
  "record_consent_evidence",
  "record_escalation",
] as const;

export type ToolName = (typeof toolNames)[number];

export const riskSignals = [
  "safety",
  "legal",
  "government",
  "media",
  "fraud",
  "security",
  "privacy",
  "discrimination",
  "abuse",
  "billing_dispute",
  "refund",
  "contract",
  "credential",
  "sensitive_data",
  "prompt_injection",
  "authority_uncertain",
  "knowledge_conflict",
] as const;

export type RiskSignal = (typeof riskSignals)[number];

export interface EvidenceItem {
  statement: string;
  source: string;
}

export interface KnowledgeCitation {
  sourceId: string;
  version: string;
  section: string;
}

export interface ModelProposal {
  responseText: string;
  primaryIntent: Intent;
  secondaryIntents: Intent[];
  intentConfidence: "high" | "medium" | "low";
  facts: EvidenceItem[];
  visitorStatements: EvidenceItem[];
  inferences: EvidenceItem[];
  unknowns: string[];
  knowledgeCitations: KnowledgeCitation[];
  recommendedState: LifecycleState;
  recommendedRoute: string | null;
  riskSignals: RiskSignal[];
  requestedTool: ToolName | null;
  requestedToolArguments: Record<string, unknown> | null;
}

export interface Session {
  id: string;
  correlationId: string;
  state: LifecycleState;
  disclosureVersion: string;
  disclosurePresented: boolean;
  sequence: number;
  primaryIntent: Intent | null;
  secondaryIntents: Intent[];
  discoveryQuestionCount: number;
  consent: Record<ConsentCategory, ConsentStatus>;
  pendingAction: ToolName | null;
  createdAt: string;
  expiresAt: string;
}

export interface VisitorMessage {
  messageId: string;
  sequence: number;
  text: string;
  pagePath: string;
  locale: string;
  timeZone: string;
}

export interface PublicReply {
  sessionId: string;
  correlationId: string;
  state: LifecycleState;
  text: string;
  status: "confirmed" | "pending" | "outcome_unknown" | "denied";
  receiptId?: string;
}


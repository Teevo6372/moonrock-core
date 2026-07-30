import type {
  LifecycleState,
  ModelProposal,
  PublicReply,
  Session,
  ToolName,
  VisitorMessage,
} from "./domain.js";
import { createEvent, type EventSink } from "./events.js";
import type { ApprovedKnowledgeRepository } from "./knowledge.js";
import type { KillSwitch } from "./kill-switch.js";
import { PolicyEngine, type RuntimeHealth } from "./policy.js";
import { redactSensitiveText } from "./redaction.js";
import type { GhlAdapter, ModelAdapter } from "./adapters.js";
import type { InMemorySessionStore } from "./session-store.js";

export interface OrchestratorDependencies {
  sessions: InMemorySessionStore;
  model: ModelAdapter;
  ghl: GhlAdapter;
  knowledge: ApprovedKnowledgeRepository;
  policy: PolicyEngine;
  events: EventSink;
  killSwitch: KillSwitch;
  validateProposal: (value: unknown) => ModelProposal;
  health: RuntimeHealth;
}

function toolIdempotencyKey(
  session: Session,
  tool: ToolName,
  args: Record<string, unknown>,
): string {
  if (tool === "request_appointment") {
    return `${session.id}:${String(args.calendarId ?? "unknown")}:${String(args.slotStart ?? "unknown")}`;
  }
  return `${session.id}:${tool}:${session.sequence}`;
}

export class NovaOrchestrator {
  constructor(private readonly dependencies: OrchestratorDependencies) {}

  createSession(): Session {
    const session = this.dependencies.sessions.create();
    this.emit(session, "session.opened", "accepted", "SESSION_CREATED");
    this.emit(session, "disclosure.presented", "confirmed", "DISCLOSURE_PRESENTED");
    return session;
  }

  async handleMessage(
    sessionId: string,
    message: VisitorMessage,
  ): Promise<PublicReply> {
    let session = this.dependencies.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.state === "EXPIRED" || session.state === "CLOSED") {
      throw new Error("Session is not active");
    }
    if (message.sequence !== session.sequence + 1) {
      throw new Error("Message sequence conflict");
    }
    if (this.dependencies.killSwitch.enabled) {
      this.emit(
        session,
        "runtime.degraded",
        "degraded",
        "KILL_SWITCH_ENABLED",
        "critical",
      );
      return {
        sessionId,
        correlationId: session.correlationId,
        state: session.state,
        text: "Nova is temporarily unavailable. Please use Moonrock's contact or Flight Plan option.",
        status: "denied",
      };
    }

    const redaction = redactSensitiveText(message.text);
    const safeMessage = { ...message, text: redaction.text };
    session.sequence = message.sequence;
    this.dependencies.sessions.save(session);
    this.emit(
      session,
      redaction.redacted ? "message.blocked" : "message.accepted",
      redaction.redacted ? "denied" : "accepted",
      redaction.redacted ? "SENSITIVE_DATA_REDACTED" : "MESSAGE_ACCEPTED",
      redaction.redacted ? "high" : "info",
    );

    const knowledge = this.dependencies.knowledge.find(
      session.primaryIntent ?? "ALL",
    );
    const rawProposal = await this.dependencies.model.propose({
      session,
      message: safeMessage,
      knowledge,
    });
    const proposal = this.dependencies.validateProposal(rawProposal);
    session.primaryIntent = proposal.primaryIntent;
    session.secondaryIntents = proposal.secondaryIntents;
    this.emit(session, "intent.classified", "confirmed", "INTENT_CLASSIFIED");

    if (proposal.riskSignals.length > 0 && proposal.requestedTool === null) {
      session = this.safeTransition(session, "ESCALATED");
      this.emit(
        session,
        "escalation.created",
        "accepted",
        "RISK_ESCALATION_REQUIRED",
        "high",
      );
      return this.reply(session, proposal.responseText, "pending");
    }

    if (proposal.requestedTool !== null) {
      return this.executeTool(session, proposal);
    }

    session = this.safeTransition(session, proposal.recommendedState);
    return this.reply(session, proposal.responseText, "confirmed");
  }

  private async executeTool(
    session: Session,
    proposal: ModelProposal,
  ): Promise<PublicReply> {
    const tool = proposal.requestedTool;
    if (tool === null) throw new Error("Tool is required");
    this.emit(session, "tool.requested", "started", "TOOL_PROPOSED");
    const decision = this.dependencies.policy.evaluateTool({
      session,
      tool,
      riskSignals: proposal.riskSignals,
      health: this.dependencies.health,
      killSwitchEnabled: this.dependencies.killSwitch.enabled,
    });

    if (decision.decision === "require_consent") {
      session = this.safeTransition(session, "AWAITING_CONSENT");
      this.emit(session, "tool.denied", "denied", decision.reasonCode);
      return this.reply(
        session,
        "Before I can do that, I need your explicit permission for the required contact or notification purpose.",
        "denied",
      );
    }
    if (decision.decision === "require_human") {
      session = this.safeTransition(session, "ESCALATED");
      this.emit(session, "tool.denied", "denied", decision.reasonCode, "high");
      return this.reply(
        session,
        "A Moonrock team member needs to review this request.",
        "pending",
      );
    }
    if (decision.decision === "deny") {
      this.emit(session, "tool.denied", "denied", decision.reasonCode);
      return this.reply(
        session,
        "I can't complete that action from this stage of the conversation.",
        "denied",
      );
    }
    if (decision.decision === "degrade") {
      this.emit(
        session,
        "runtime.degraded",
        "degraded",
        decision.reasonCode,
        "high",
      );
      return this.reply(
        session,
        "That service is temporarily unavailable. I can still help you find a manual next step.",
        "pending",
      );
    }

    session.pendingAction = tool;
    session = this.safeTransition(session, "ADMINISTRATIVE_ACTION_PENDING");
    this.emit(session, "tool.started", "started", "TOOL_AUTHORIZED");
    const result = await this.dependencies.ghl.execute({
      tool,
      args: proposal.requestedToolArguments ?? {},
      idempotencyKey: toolIdempotencyKey(
        session,
        tool,
        proposal.requestedToolArguments ?? {},
      ),
    });

    if (result.status === "outcome_unknown") {
      this.emit(
        session,
        "tool.outcome_unknown",
        "outcome_unknown",
        "PROVIDER_OUTCOME_UNKNOWN",
        "high",
      );
      return this.reply(
        session,
        "I couldn't confirm whether that completed. I won't repeat it automatically; a Moonrock team member can verify it.",
        "outcome_unknown",
      );
    }

    const completedState: LifecycleState =
      tool === "request_appointment"
        ? "BOOKING_CONFIRMED"
        : "FOLLOW_UP_REQUESTED";
    session = this.safeTransition(session, completedState);
    session.pendingAction = null;
    this.dependencies.sessions.save(session);
    this.emit(
      session,
      tool === "request_appointment" ? "booking.confirmed" : "tool.succeeded",
      "confirmed",
      "PROVIDER_RECEIPT_CONFIRMED",
    );
    return {
      ...this.reply(session, proposal.responseText, "confirmed"),
      receiptId: result.receiptId,
    };
  }

  private safeTransition(session: Session, to: LifecycleState): Session {
    if (session.state === to) return session;
    return this.dependencies.sessions.transition(session.id, to);
  }

  private reply(
    session: Session,
    text: string,
    status: PublicReply["status"],
  ): PublicReply {
    return {
      sessionId: session.id,
      correlationId: session.correlationId,
      state: session.state,
      text,
      status,
    };
  }

  private emit(
    session: Session,
    name: Parameters<typeof createEvent>[0]["name"],
    outcome: Parameters<typeof createEvent>[0]["outcome"],
    reasonCode: string,
    severity: Parameters<typeof createEvent>[0]["severity"] = "info",
  ): void {
    this.dependencies.events.emit(
      createEvent({
        name,
        correlationId: session.correlationId,
        sessionId: session.id,
        state: session.state,
        outcome,
        severity,
        reasonCode,
        knowledgeVersion: this.dependencies.knowledge.version,
      }),
    );
  }
}


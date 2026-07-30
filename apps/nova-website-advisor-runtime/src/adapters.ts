import { randomUUID } from "node:crypto";
import type { ModelProposal, Session, VisitorMessage } from "./domain.js";
import type { KnowledgeRecord } from "./knowledge.js";

export interface ModelAdapter {
  propose(input: {
    session: Session;
    message: VisitorMessage;
    knowledge: KnowledgeRecord[];
  }): Promise<unknown>;
}

export interface ProviderReceipt {
  receiptId: string;
  providerObjectId: string;
  status: "confirmed";
  recordedAt: string;
}

export interface GhlAdapter {
  execute(input: {
    tool: string;
    args: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<ProviderReceipt | { status: "outcome_unknown" }>;
}

export class MockModelAdapter implements ModelAdapter {
  constructor(
    private readonly proposalFactory: (input: {
      session: Session;
      message: VisitorMessage;
      knowledge: KnowledgeRecord[];
    }) => ModelProposal,
  ) {}

  async propose(input: {
    session: Session;
    message: VisitorMessage;
    knowledge: KnowledgeRecord[];
  }): Promise<unknown> {
    return Promise.resolve(this.proposalFactory(input));
  }
}

export class MockGhlAdapter implements GhlAdapter {
  readonly #receipts = new Map<string, ProviderReceipt>();
  calls = 0;
  outcomeUnknown = false;

  async execute(input: {
    tool: string;
    args: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<ProviderReceipt | { status: "outcome_unknown" }> {
    this.calls += 1;
    if (this.outcomeUnknown) return { status: "outcome_unknown" };
    const existing = this.#receipts.get(input.idempotencyKey);
    if (existing) return structuredClone(existing);
    const receipt: ProviderReceipt = {
      receiptId: randomUUID().replaceAll("-", ""),
      providerObjectId: randomUUID().replaceAll("-", ""),
      status: "confirmed",
      recordedAt: new Date().toISOString(),
    };
    this.#receipts.set(input.idempotencyKey, receipt);
    return structuredClone(receipt);
  }
}


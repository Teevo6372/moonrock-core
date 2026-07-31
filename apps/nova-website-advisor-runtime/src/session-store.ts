import { randomUUID } from "node:crypto";
import type {
  ConsentCategory,
  ConsentStatus,
  LifecycleState,
  Session,
} from "./domain.js";
import { consentCategories } from "./domain.js";
import { assertTransition } from "./lifecycle.js";

function newConsentState(): Record<ConsentCategory, ConsentStatus> {
  return Object.fromEntries(
    consentCategories.map((category) => [category, "not_requested"]),
  ) as Record<ConsentCategory, ConsentStatus>;
}

export class InMemorySessionStore {
  readonly #sessions = new Map<string, Session>();

  create(now = new Date(), ttlMinutes = 30): Session {
    const expires = new Date(now.getTime() + ttlMinutes * 60_000);
    const session: Session = {
      id: randomUUID().replaceAll("-", ""),
      correlationId: randomUUID().replaceAll("-", ""),
      state: "DISCLOSED",
      disclosureVersion: "nova-disclosure-1.0.0",
      disclosurePresented: true,
      sequence: 0,
      primaryIntent: null,
      secondaryIntents: [],
      discoveryQuestionCount: 0,
      consent: newConsentState(),
      pendingAction: null,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    this.#sessions.set(session.id, session);
    return structuredClone(session);
  }

  restore(session: Session): Session {
    const copy = structuredClone(session);
    this.#sessions.set(copy.id, copy);
    return structuredClone(copy);
  }

  get(id: string, now = new Date()): Session | null {
    const session = this.#sessions.get(id);
    if (!session) return null;
    if (new Date(session.expiresAt) <= now && session.state !== "EXPIRED") {
      session.state = "EXPIRED";
    }
    return structuredClone(session);
  }

  save(session: Session): Session {
    if (!this.#sessions.has(session.id)) {
      throw new Error("Session does not exist");
    }
    this.#sessions.set(session.id, structuredClone(session));
    return structuredClone(session);
  }

  transition(id: string, to: LifecycleState): Session {
    const session = this.#sessions.get(id);
    if (!session) throw new Error("Session does not exist");
    assertTransition(session.state, to);
    session.state = to;
    return structuredClone(session);
  }

  setConsent(
    id: string,
    category: ConsentCategory,
    status: ConsentStatus,
  ): Session {
    const session = this.#sessions.get(id);
    if (!session) throw new Error("Session does not exist");
    session.consent[category] = status;
    return structuredClone(session);
  }
}

import { createHash } from "node:crypto";

export interface KnowledgeRecord {
  id: string;
  intent: string;
  content: string;
  sourceId: string;
  version: string;
  section: string;
  status: "approved";
  classification: "public-approved";
  reviewAt: string;
}

export interface KnowledgeBundle {
  bundleId: "nova-website-advisor-r1";
  version: string;
  contentHash: string;
  records: KnowledgeRecord[];
}

function canonicalRecords(records: KnowledgeRecord[]): string {
  return JSON.stringify(
    [...records].sort((a, b) => a.id.localeCompare(b.id)),
  );
}

export function calculateKnowledgeHash(records: KnowledgeRecord[]): string {
  return `sha256:${createHash("sha256").update(canonicalRecords(records)).digest("hex")}`;
}

export class KnowledgeValidationError extends Error {}

export class ApprovedKnowledgeRepository {
  readonly #bundle: KnowledgeBundle;

  constructor(bundle: KnowledgeBundle, now = new Date()) {
    if (bundle.contentHash !== calculateKnowledgeHash(bundle.records)) {
      throw new KnowledgeValidationError("Knowledge bundle hash does not match");
    }
    for (const record of bundle.records) {
      if (record.status !== "approved" || record.classification !== "public-approved") {
        throw new KnowledgeValidationError("Knowledge record is not public-approved");
      }
      if (new Date(record.reviewAt) <= now) {
        throw new KnowledgeValidationError(`Knowledge record expired: ${record.id}`);
      }
    }
    this.#bundle = structuredClone(bundle);
  }

  get version(): string {
    return this.#bundle.version;
  }

  find(intent: string, limit = 5): KnowledgeRecord[] {
    return this.#bundle.records
      .filter((record) => record.intent === intent || record.intent === "ALL")
      .slice(0, limit)
      .map((record) => structuredClone(record));
  }
}


import { describe, expect, it } from "vitest";
import {
  ApprovedKnowledgeRepository,
  calculateKnowledgeHash,
  KnowledgeValidationError,
  type KnowledgeRecord,
} from "../src/knowledge.js";
import { redactSensitiveText } from "../src/redaction.js";
import { knowledgeRepository } from "./fixtures.js";

describe("knowledge repository", () => {
  it("returns bounded public-approved records", () => {
    expect(knowledgeRepository().find("LAUNCH")).toHaveLength(1);
  });

  it("rejects a changed bundle hash", () => {
    expect(
      () =>
        new ApprovedKnowledgeRepository({
          bundleId: "nova-website-advisor-r1",
          version: "1.0.0-test",
          contentHash: `sha256:${"0".repeat(64)}`,
          records: [],
        }),
    ).toThrow(KnowledgeValidationError);
  });

  it("rejects expired records", () => {
    const records: KnowledgeRecord[] = [
      {
        id: "expired",
        intent: "ALL",
        content: "Old information",
        sourceId: "old",
        version: "1",
        section: "x",
        status: "approved",
        classification: "public-approved",
        reviewAt: "2020-01-01T00:00:00Z",
      },
    ];
    expect(
      () =>
        new ApprovedKnowledgeRepository(
          {
            bundleId: "nova-website-advisor-r1",
            version: "1",
            contentHash: calculateKnowledgeHash(records),
            records,
          },
          new Date("2026-01-01T00:00:00Z"),
        ),
    ).toThrow(/expired/);
  });
});

describe("redaction", () => {
  it("redacts password-like secrets", () => {
    const result = redactSensitiveText("password: open-sesame");
    expect(result.text).toContain("[REDACTED_SECRET]");
    expect(result.redacted).toBe(true);
  });

  it("redacts Social Security-like values", () => {
    expect(redactSensitiveText("123-45-6789").text).toBe(
      "[REDACTED_GOVERNMENT_ID]",
    );
  });

  it("does not alter ordinary business text", () => {
    const value = "I want more booked calls for my plumbing company.";
    expect(redactSensitiveText(value)).toEqual({
      text: value,
      redacted: false,
      labels: [],
    });
  });
});


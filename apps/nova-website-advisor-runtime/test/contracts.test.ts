import { describe, expect, it } from "vitest";
import {
  ContractValidationError,
  createModelProposalValidator,
} from "../src/schema-validation.js";
import { loadModelSchema, proposal } from "./fixtures.js";

describe("model proposal contract", () => {
  const validate = createModelProposalValidator(loadModelSchema());

  it("accepts a complete governed proposal", () => {
    expect(validate(proposal()).primaryIntent).toBe("LAUNCH");
  });

  it("rejects an arbitrary tool", () => {
    const value = {
      ...proposal(),
      requestedTool: "call_any_url",
      requestedToolArguments: {},
    };
    expect(() => validate(value)).toThrow(ContractValidationError);
  });

  it("rejects extra properties", () => {
    expect(() => validate({ ...proposal(), approved: true })).toThrow(
      ContractValidationError,
    );
  });

  it("requires arguments when a tool is proposed", () => {
    expect(() =>
      validate(
        proposal({
          requestedTool: "create_contact",
          requestedToolArguments: null,
        }),
      ),
    ).toThrow(ContractValidationError);
  });

  it("rejects more than two secondary intents", () => {
    expect(() =>
      validate(
        proposal({
          secondaryIntents: ["GROWTH", "MARKETING", "SYSTEMS"],
        }),
      ),
    ).toThrow(ContractValidationError);
  });
});


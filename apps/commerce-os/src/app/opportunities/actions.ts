"use server";

import {
  parseOpportunityForm,
  validateOpportunityInput,
  type FieldErrors,
} from "@/domain/opportunity-input";
import { persistOpportunity } from "@/services/opportunity-service";

export type EvaluationState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: FieldErrors;
  warnings?: string[];
  opportunityId?: string;
  result?: NonNullable<
    Awaited<ReturnType<typeof persistOpportunity>>["calculation"]
  >;
};

export async function evaluateOpportunityAction(
  _previous: EvaluationState,
  formData: FormData,
): Promise<EvaluationState> {
  const parsed = parseOpportunityForm(formData);
  const mode = formData.get("_intent") === "draft" ? "draft" : "evaluate";
  const validation = validateOpportunityInput(parsed);
  if (!validation.ok) {
    return {
      status: "error",
      message: "Correct the highlighted fields before evaluating.",
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }
  try {
    const evaluation = await persistOpportunity(
      validation.value,
      validation.warnings,
      mode,
    );
    return {
      status: "success",
      message:
        mode === "draft"
          ? "Draft saved. No calculation result was created."
          : "Evaluation saved with an immutable calculation snapshot.",
      warnings: validation.warnings,
      opportunityId: evaluation.opportunityId,
      result: evaluation.calculation,
    };
  } catch (error) {
    console.error("Opportunity evaluation failed", error);
    return {
      status: "error",
      message:
        "The evaluation could not be saved. No partial records were committed.",
    };
  }
}

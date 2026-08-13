export type AiEmployeeId =
  | "reputation_retention"
  | "lead_response"
  | "customer_care"
  | "receptionist"
  | "sales_follow_up"
  | "front_office"
  | "ai_workforce";

export interface AiEmployeeOffer {
  id: AiEmployeeId;
  name: string;
  setupFeeUsd: number;
  monthlyFeeUsd: number;
  includedVoiceMinutes?: number;
  overageVoiceRateUsd?: number;
  autonomousSaleAllowed: boolean;
  foundingCustomerSetupFeeUsd?: number;
  solves: readonly string[];
}

export const AI_EMPLOYEE_CATALOG: Readonly<Record<AiEmployeeId, AiEmployeeOffer>> = {
  reputation_retention: {
    id: "reputation_retention",
    name: "AI Reputation & Retention Agent",
    setupFeeUsd: 199,
    monthlyFeeUsd: 149,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 100,
    solves: ["review_generation", "retention", "reactivation"],
  },
  lead_response: {
    id: "lead_response",
    name: "AI Lead Response Agent",
    setupFeeUsd: 299,
    monthlyFeeUsd: 199,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 150,
    solves: ["slow_lead_response", "lead_capture", "lead_qualification"],
  },
  customer_care: {
    id: "customer_care",
    name: "AI Customer Care Agent",
    setupFeeUsd: 299,
    monthlyFeeUsd: 199,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 150,
    solves: ["repetitive_support", "service_intake", "customer_questions"],
  },
  receptionist: {
    id: "receptionist",
    name: "AI Receptionist",
    setupFeeUsd: 399,
    monthlyFeeUsd: 249,
    includedVoiceMinutes: 300,
    overageVoiceRateUsd: 0.25,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 200,
    solves: ["missed_calls", "call_qualification", "appointment_booking"],
  },
  sales_follow_up: {
    id: "sales_follow_up",
    name: "AI Sales & Follow-Up Agent",
    setupFeeUsd: 499,
    monthlyFeeUsd: 299,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 250,
    solves: ["estimate_follow_up", "lead_nurture", "reactivation"],
  },
  front_office: {
    id: "front_office",
    name: "Moonrock AI Front Office",
    setupFeeUsd: 799,
    monthlyFeeUsd: 499,
    includedVoiceMinutes: 500,
    overageVoiceRateUsd: 0.25,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 399,
    solves: [
      "missed_calls",
      "slow_lead_response",
      "lead_capture",
      "lead_qualification",
      "appointment_booking",
      "estimate_follow_up",
    ],
  },
  ai_workforce: {
    id: "ai_workforce",
    name: "Moonrock AI Workforce",
    setupFeeUsd: 1499,
    monthlyFeeUsd: 749,
    autonomousSaleAllowed: false,
    solves: ["multi_department", "complex_operations", "custom_workflows"],
  },
};

export const FOUNDING_CUSTOMER_LIMIT = 10;

export function priceOffer(
  id: AiEmployeeId,
  options: { foundingCustomer?: boolean } = {},
): AiEmployeeOffer {
  const offer = AI_EMPLOYEE_CATALOG[id];
  if (!options.foundingCustomer || offer.foundingCustomerSetupFeeUsd === undefined) {
    return offer;
  }

  return {
    ...offer,
    setupFeeUsd: offer.foundingCustomerSetupFeeUsd,
  };
}

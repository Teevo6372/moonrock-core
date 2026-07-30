export interface ReleaseGateEvidence {
  contractsValidated: boolean;
  safetyEvaluationsPassed: boolean;
  privacyReviewApproved: boolean;
  accessibilityReviewApproved: boolean;
  threatModelApproved: boolean;
  residualRisksOwned: boolean;
  operatingOwnerAssigned: boolean;
  incidentPathAssigned: boolean;
  rollbackVerified: boolean;
  providerCredentialsAbsentFromRepository: boolean;
  productionActivationApproved: boolean;
}

export interface ReleaseGateDecision {
  readyForProductionActivation: boolean;
  blockers: string[];
  decisionAuthority: "HUMAN_EXECUTIVE";
}

export function evaluateReleaseGate(
  evidence: ReleaseGateEvidence,
): ReleaseGateDecision {
  const blockers = Object.entries(evidence)
    .filter(([, satisfied]) => !satisfied)
    .map(([control]) => control);
  return {
    readyForProductionActivation: blockers.length === 0,
    blockers,
    decisionAuthority: "HUMAN_EXECUTIVE",
  };
}

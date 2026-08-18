import type { DiagnosticInput } from "./diagnostic-engine.js";

export type ProgressiveSignalStatus = "watching" | "emerging" | "confirmed" | "healthy";

export interface ProgressiveFlightPlanSignal {
  id: string;
  label: string;
  status: ProgressiveSignalStatus;
  insight: string;
}

export interface ProgressiveFlightPlan {
  phase: "listening" | "mapping" | "prioritizing" | "ready";
  summary: string;
  signals: ProgressiveFlightPlanSignal[];
  nextFocus?: string;
}

function challengeText(answers: Partial<DiagnosticInput>): string {
  return String(answers.businessChallenges ?? "").toLowerCase();
}

export function buildProgressiveFlightPlan(answers: Partial<DiagnosticInput>, completed = false): ProgressiveFlightPlan {
  const signals: ProgressiveFlightPlanSignal[] = [];
  const challenges = challengeText(answers);

  if (answers.businessChallenges) {
    signals.push({
      id: "stated-priority",
      label: "What matters most",
      status: "confirmed",
      insight: "Nova is using the problem you described as the anchor instead of forcing the business into a generic checklist.",
    });
  }

  if ((answers.missedCallsPerMonth ?? 0) > 0 || /call|phone|voicemail|after.?hours|weekend/.test(challenges)) {
    signals.push({
      id: "phone-coverage",
      label: "Customer coverage",
      status: (answers.missedCallsPerMonth ?? 0) > 0 ? "confirmed" : "emerging",
      insight: "Phone coverage may be creating customer friction or opportunity leakage, so Nova is sizing when intelligent coverage would actually help.",
    });
  }

  if ((answers.medianLeadResponseMinutes ?? 0) > 30 || /lead|response|slow|missed opportun/.test(challenges)) {
    signals.push({
      id: "lead-response",
      label: "Lead response",
      status: (answers.medianLeadResponseMinutes ?? 0) > 30 ? "confirmed" : "emerging",
      insight: "Speed-to-lead is worth watching because automation can protect buyer intent while routing exceptions to a person.",
    });
  } else if (answers.medianLeadResponseMinutes !== undefined && answers.medianLeadResponseMinutes <= 15) {
    signals.push({ id: "lead-response", label: "Lead response", status: "healthy", insight: "Response time currently looks healthy, so Nova is looking elsewhere for higher-impact friction." });
  }

  if (answers.estimatesNeedManualFollowUp === true || /follow.?up|estimate|quote|proposal/.test(challenges)) {
    signals.push({
      id: "follow-up",
      label: "Follow-up consistency",
      status: answers.estimatesNeedManualFollowUp === true ? "confirmed" : "emerging",
      insight: "Follow-up may depend too much on memory. Monitoring stalled opportunities and triggering the right next step could reduce dropped balls.",
    });
  } else if (answers.estimatesNeedManualFollowUp === false) {
    signals.push({ id: "follow-up", label: "Follow-up consistency", status: "healthy", insight: "Follow-up sounds reasonably controlled, so Nova will not make it a priority without stronger evidence." });
  }

  if (answers.appointmentsNeedManualScheduling === true) {
    signals.push({ id: "scheduling", label: "Scheduling handoff", status: "confirmed", insight: "Routine scheduling still needs human coordination, which may be a good place to reduce wait time without removing human judgment." });
  } else if (answers.appointmentsNeedManualScheduling === false) {
    signals.push({ id: "scheduling", label: "Scheduling handoff", status: "healthy", insight: "Scheduling already looks controlled, so Nova is keeping it out of the way unless another answer changes that picture." });
  }

  if (answers.repetitiveSupportLoad === "high" || /repeat|same question|support|customer question/.test(challenges)) {
    signals.push({
      id: "support-load",
      label: "Repetitive customer work",
      status: answers.repetitiveSupportLoad === "high" ? "confirmed" : "emerging",
      insight: "Repeated customer questions may be consuming team capacity that an AI Employee could handle while escalating unusual situations.",
    });
  }

  if (answers.dormantCustomerList === true) {
    signals.push({ id: "reactivation", label: "Existing relationship value", status: "confirmed", insight: "Past customers and old leads may offer a practical re-engagement opportunity before spending more to create brand-new demand." });
  }

  if (answers.founderHandlesMostAdmin === true || /busy|admin|overwhelm|wearing.*hat|time/.test(challenges)) {
    signals.push({
      id: "capacity",
      label: "Owner / team capacity",
      status: answers.founderHandlesMostAdmin === true ? "confirmed" : "emerging",
      insight: "Routine work may be consuming time that should stay focused on judgment, relationships, delivery, or growth.",
    });
  }

  const visibleSignals = signals.slice(0, 4);
  const answered = Object.keys(answers).filter((key) => key !== "path").length;
  const phase: ProgressiveFlightPlan["phase"] = completed ? "ready" : answered >= 7 ? "prioritizing" : answered >= 3 ? "mapping" : "listening";
  const summary = completed
    ? "The working signals have been reconciled into your completed Flight Plan."
    : visibleSignals.length
      ? "I’m building this as we talk. These are working signals, not final judgments—they can strengthen, disappear, or change priority as I learn more."
      : "I’m still getting the lay of the land. I’ll surface useful patterns here as soon as there’s enough context to say something meaningful.";

  return {
    phase,
    summary,
    signals: visibleSignals,
    ...(!completed ? { nextFocus: phase === "listening" ? "Understanding the business and the problem in your words" : phase === "mapping" ? "Testing which bottlenecks are real versus assumed" : "Prioritizing the highest-impact opportunities" } : {}),
  };
}

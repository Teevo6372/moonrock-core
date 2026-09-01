import { describe, expect, it } from "vitest";
import {
  createSiteChangeRequest,
  decideSiteChange,
  type SiteChangeInterpreter,
} from "./orchestration";

const input = (customerMessage: string) => ({
  id: "req-100",
  siteId: "reference",
  requestedBy: "customer",
  customerMessage,
  createdAt: "2026-09-01T23:00:00.000Z",
});

function interpreterFor(intent: string, requestedChanges: Array<{ target: string; operation: "update"; value?: unknown }>): SiteChangeInterpreter {
  return {
    async interpret() {
      return { intent, requestedChanges };
    },
  };
}

describe("Nova site change orchestration", () => {
  it("turns a bounded routine request into an execution-ready request", async () => {
    const request = await createSiteChangeRequest(
      input("Change Saturday hours from 8-2 to 8-4"),
      interpreterFor("update_business_hours", [
        { target: "business.hours.saturday", operation: "update", value: "8-4" },
      ]),
    );

    expect(request.risk).toBe("low");
    expect(request.mode).toBe("auto");
    expect(decideSiteChange(request).status).toBe("ready_for_execution");
  });

  it("routes structural requests to preview instead of execution", async () => {
    const request = await createSiteChangeRequest(
      input("Redesign the homepage layout"),
      interpreterFor("redesign_homepage", [
        { target: "pages.home", operation: "update", value: "new-layout" },
      ]),
    );

    expect(decideSiteChange(request).status).toBe("preview_required");
  });

  it("routes high-risk requests to operator review", async () => {
    const request = await createSiteChangeRequest(
      input("Change the payment account"),
      interpreterFor("change_payment_account", [
        { target: "payments.account", operation: "update", value: "new-account" },
      ]),
    );

    expect(decideSiteChange(request).status).toBe("operator_review");
  });

  it("does not execute vague requests that produce no bounded change", async () => {
    const request = await createSiteChangeRequest(
      input("Make the website better"),
      interpreterFor("unknown", []),
    );

    expect(decideSiteChange(request).status).toBe("needs_clarification");
  });
});

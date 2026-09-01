import { describe, expect, it } from "vitest";
import { canDeployAutomatically, classifySiteChange, type SiteChangeRequest } from "./site-change";

describe("site change policy", () => {
  it("allows bounded routine content changes", () => {
    expect(classifySiteChange("Change Saturday hours from 8-2 to 8-4")).toEqual({
      risk: "low",
      mode: "auto",
    });
  });

  it("requires preview for structural changes", () => {
    expect(classifySiteChange("Redesign the homepage layout and move section testimonials above About")).toEqual({
      risk: "moderate",
      mode: "preview_required",
    });
  });

  it("requires operator review for DNS and payment changes", () => {
    expect(classifySiteChange("Move my DNS and change the payment account")).toEqual({
      risk: "high",
      mode: "operator_review",
    });
  });

  it("blocks auto deployment when no bounded change was parsed", () => {
    const request: SiteChangeRequest = {
      id: "req-1",
      siteId: "reference",
      requestedBy: "customer",
      customerMessage: "Make it better",
      intent: "unknown",
      risk: "low",
      mode: "auto",
      requestedChanges: [],
      createdAt: "2026-09-01T00:00:00.000Z",
    };

    expect(canDeployAutomatically(request)).toBe(false);
  });
});

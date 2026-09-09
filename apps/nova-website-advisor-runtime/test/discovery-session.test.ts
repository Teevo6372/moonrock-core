import { describe, expect, it } from "vitest";
import { createDiscoverySession, recordConversationSale, recordTier0Download } from "../src/discovery-session.js";
import { getConversationSaleTotal, requiresCumulativeValueReview } from "../src/conversation-sale-tracker.js";

describe("recordTier0Download", () => {
  it("increments tier0DownloadsCount and recomputes the ascension score through the single source of truth", () => {
    const session = createDiscoverySession("existing_business");
    const before = session.ascensionScore ?? 0;

    const afterOne = recordTier0Download(session);
    expect(afterOne.tier0DownloadsCount).toBe(1);
    expect(afterOne.ascensionScore).toBeGreaterThan(before);

    const afterTwo = recordTier0Download(afterOne);
    expect(afterTwo.tier0DownloadsCount).toBe(2);
    expect(afterTwo.ascensionScore).toBeGreaterThanOrEqual(afterOne.ascensionScore!);
  });

  it("never lets Tier 0 downloads alone push the score to a completed-tier-purchase level", () => {
    let session = createDiscoverySession("existing_business");
    for (let i = 0; i < 20; i += 1) session = recordTier0Download(session);
    // A single completed trust_builder purchase alone scores 40; downloads-only must stay a soft signal beneath that.
    expect(session.ascensionScore!).toBeLessThan(40);
  });
});

describe("recordConversationSale", () => {
  it("appends to conversationSalesClosed and purchaseHistory in one event, keeping both in sync", () => {
    const session = createDiscoverySession("existing_business");
    const after = recordConversationSale(session, {
      offerId: "receptionist",
      offerName: "AI Receptionist",
      ladderTier: "ai_employee",
      setupFeeUsd: 200,
      monthlyFeeUsd: 249,
    });
    expect(after.conversationSalesClosed).toHaveLength(1);
    expect(after.conversationSalesClosed![0]!.offerId).toBe("receptionist");
    expect(after.purchaseHistory).toHaveLength(1);
    expect(after.purchaseHistory![0]!.tier).toBe("ai_employee");
    // A closed sale is also a purchase-history event, so the ascension score reflects it immediately.
    expect(after.ascensionScore!).toBeGreaterThan(session.ascensionScore ?? 0);
  });

  it("lets the conversation-sale-total tracker read the running total straight off session state", () => {
    let session = createDiscoverySession("existing_business");
    session = recordConversationSale(session, { offerId: "sales_follow_up", offerName: "AI Sales & Follow-Up Agent", ladderTier: "ai_employee", setupFeeUsd: 250, monthlyFeeUsd: 499 });
    session = recordConversationSale(session, { offerId: "customer_care", offerName: "AI Customer Care Agent", ladderTier: "ai_employee", setupFeeUsd: 150, monthlyFeeUsd: 299 });

    const total = getConversationSaleTotal(session.conversationSalesClosed ?? []);
    expect(total.monthlyCommitmentUsd).toBe(798);
    // Two individually-fine AI Employee sales combine, in one sitting, to exceed the $700/mo cumulative threshold.
    expect(requiresCumulativeValueReview(total)).toBe(true);
  });
});

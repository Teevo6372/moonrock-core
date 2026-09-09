import { describe, expect, it } from "vitest";
import { createDiscoverySession, recordTier0Download } from "../src/discovery-session.js";

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

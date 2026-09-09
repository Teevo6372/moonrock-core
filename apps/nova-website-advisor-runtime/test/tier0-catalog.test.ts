import { describe, expect, it } from "vitest";
import { getTier0Catalog, TIER0_CATALOG, TIER0_CATEGORIES, type Tier0Category } from "../src/tier0-catalog.js";

const EXPECTED_CATEGORY_COUNTS: Record<Tier0Category, number> = {
  "Marketing & Lead Gen": 14,
  "Customer Experience & Retention": 8,
  "Operations & Systems": 9,
  "Pricing & Finance": 7,
  "Hiring & Team": 4,
  "Local SEO, Reputation & Digital Presence": 5,
  "AI & Automation Starter Kits": 3,
  "Retention Gifts": 20,
};

describe("TIER0_CATALOG shape", () => {
  it("has exactly 70 items", () => {
    expect(TIER0_CATALOG.length).toBe(70);
  });

  it("has unique ids", () => {
    const ids = TIER0_CATALOG.map((product) => product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("matches Section 5.0's category breakdown", () => {
    for (const category of TIER0_CATEGORIES) {
      const count = TIER0_CATALOG.filter((product) => product.category === category).length;
      expect(count, `category ${category}`).toBe(EXPECTED_CATEGORY_COUNTS[category]);
    }
  });

  it("gives every product a live GHL Media Storage file link", () => {
    for (const product of TIER0_CATALOG) {
      expect(product.fileLink).toMatch(/^https:\/\/assets\.cdn\.filesafe\.space\/RX0RvGiTSimm80VawY25\/media\/.+/);
    }
  });
});

describe("0a / 0b split", () => {
  it("has 50 paid (0a) and 20 free (0b) items", () => {
    expect(TIER0_CATALOG.filter((product) => product.subTier === "0a").length).toBe(50);
    expect(TIER0_CATALOG.filter((product) => product.subTier === "0b").length).toBe(20);
  });

  it("prices every 0a item above zero and assigns it a GHL Payments product id", () => {
    for (const product of TIER0_CATALOG.filter((p) => p.subTier === "0a")) {
      expect(product.priceUsd, product.name).toBeGreaterThan(0);
      expect(product.ghlProductId, product.name).toBeTruthy();
    }
  });

  it("prices every 0b item at zero with no GHL Payments product - delivered via workflow, not checkout", () => {
    for (const product of TIER0_CATALOG.filter((p) => p.subTier === "0b")) {
      expect(product.priceUsd, product.name).toBe(0);
      expect(product.ghlProductId, product.name).toBeUndefined();
      expect(product.category).toBe("Retention Gifts");
    }
  });
});

describe("getTier0Catalog", () => {
  it("returns the full 70-item catalog with no filters", () => {
    expect(getTier0Catalog()).toHaveLength(70);
  });

  it("filters by subTier", () => {
    expect(getTier0Catalog({ subTier: "0a" })).toHaveLength(50);
    expect(getTier0Catalog({ subTier: "0b" })).toHaveLength(20);
  });

  it("filters by category", () => {
    expect(getTier0Catalog({ category: "AI & Automation Starter Kits" })).toHaveLength(3);
  });

  it("filters by subTier and category together", () => {
    expect(getTier0Catalog({ subTier: "0b", category: "Retention Gifts" })).toHaveLength(20);
    expect(getTier0Catalog({ subTier: "0a", category: "Retention Gifts" })).toHaveLength(0);
  });
});

describe("spot-checked catalog entries", () => {
  it("prices the Missed-Call Money Leak Calculator at $17", () => {
    const product = TIER0_CATALOG.find((p) => p.id === "01");
    expect(product?.name).toBe("The Missed-Call Money Leak Calculator");
    expect(product?.priceUsd).toBe(17);
    expect(product?.ghlProductId).toBe("6aa046962b997ee15a9d1d85");
  });

  it("prices the Automation Starter Roadmap (last paid item) at $12", () => {
    const product = TIER0_CATALOG.find((p) => p.id === "50");
    expect(product?.name).toBe("The Automation Starter Roadmap");
    expect(product?.priceUsd).toBe(12);
  });

  it("includes the Quick Start Guide as the last free retention gift", () => {
    const product = TIER0_CATALOG.find((p) => p.id === "r20");
    expect(product?.name).toBe("Getting the Most Out of Nova — Quick Start Guide");
    expect(product?.subTier).toBe("0b");
  });
});

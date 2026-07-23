import { describe, expect, it } from "vitest";

import {
  toProfitEngineInput,
  validateOpportunityInput,
  type OpportunityInput,
} from "./opportunity-input";

const completeInput: OpportunityInput = {
  productName: "Modern Horizons 3 Play Booster Box",
  productType: "sealed_product",
  game: "Magic: The Gathering",
  condition: "New",
  supplierName: "Example distributor",
  supplierUrl: "https://supplier.invalid/offer",
  quantity: 2,
  unitCost: "120.00",
  inboundShippingTotal: "8.00",
  acquisitionTaxTotal: "0",
  otherAcquisitionCostTotal: "0",
  observedAt: "2026-07-23T12:00:00.000Z",
  evidenceReference: "Manual quote",
  expectedUnitSalePrice: "180.00",
  buyerShippingRevenuePerUnit: "0",
  promotedListingRate: "0.05",
  outboundShippingPerOrder: "7.00",
  packagingCostPerOrder: "0.50",
  otherSellingCostPerOrder: "0",
  minimumNetProfit: "0",
  minimumRoi: "0.30",
};

describe("opportunity input validation", () => {
  it("accepts complete input and fresh evidence", () => {
    expect(
      validateOpportunityInput(completeInput, new Date("2026-07-23T13:00:00Z")),
    ).toEqual({ ok: true, value: completeInput, warnings: [] });
  });

  it("rejects missing required product information", () => {
    const result = validateOpportunityInput({
      ...completeInput,
      productName: "",
      productId: undefined,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.productName).toMatch(/product/i);
  });

  it("rejects invalid quantity and money values", () => {
    const result = validateOpportunityInput({
      ...completeInput,
      quantity: 0,
      unitCost: "-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.quantity).toBeDefined();
      expect(result.errors.unitCost).toBeDefined();
    }
  });

  it("warns when supplier evidence is stale", () => {
    const result = validateOpportunityInput(
      { ...completeInput, observedAt: "2026-05-01T00:00:00Z" },
      new Date("2026-07-23T00:00:00Z"),
    );
    expect(result.warnings).toEqual([expect.stringMatching(/30 days/i)]);
  });

  it("maps database fee values into the engine input", () => {
    expect(
      toProfitEngineInput(completeInput, {
        marketplaceFeeRate: "0.13",
        marketplaceFeeFixed: "0.30",
        paymentFeeRate: "0.029",
        paymentFeeFixed: "0.30",
      }),
    ).toMatchObject({
      marketplaceFeeRate: "0.13",
      marketplaceFeeFixedPerOrder: "0.30",
      paymentFeeRate: "0.029",
      paymentFeeFixedPerOrder: "0.30",
      promotedListingRate: "0.05",
    });
  });
});

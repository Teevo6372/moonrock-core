import { describe, expect, it } from "vitest";
import { calculateProfit } from "./profit-engine";

describe("calculateProfit", () => {
  it("calculates a standard seller-paid shipping opportunity", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 1,
      expectedUnitSalePrice: "30",
      marketplaceFeeRate: "0.13",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
      minimumRoi: "0.30",
    });

    expect(result).toMatchObject({
      acquisitionTotal: "10.0000",
      expectedGrossRevenue: "30.0000",
      expectedSellingCost: "11.9000",
      expectedNetProfit: "8.1000",
      roi: "0.8100",
      margin: "0.2700",
      breakEvenItemPrice: "20.6897",
      minimumAcceptableItemPrice: "24.1379",
    });
  });

  it("credits buyer-paid shipping after percentage fees", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 1,
      expectedUnitSalePrice: "25",
      buyerShippingRevenuePerUnit: "7",
      marketplaceFeeRate: "0.13",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result.expectedNetProfit).toBe("9.8400");
    expect(result.breakEvenItemPrice).toBe("13.6897");
  });

  it("models promoted listing expense against item revenue", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 2,
      expectedUnitSalePrice: "30",
      marketplaceFeeRate: "0.13",
      promotedListingRate: "0.20",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result.expectedSellingCost).toBe("35.8000");
    expect(result.expectedNetProfit).toBe("4.2000");
    expect(result.roi).toBe("0.2100");
  });

  it("rejects invalid quantities and mathematically impossible rates", () => {
    expect(() =>
      calculateProfit({
        unitCost: "10",
        quantity: 0,
        expectedUnitSalePrice: "30",
      }),
    ).toThrow("quantity must be a positive integer");

    expect(() =>
      calculateProfit({
        unitCost: "10",
        quantity: 1,
        expectedUnitSalePrice: "30",
        marketplaceFeeRate: "0.70",
        promotedListingRate: "0.30",
      }),
    ).toThrow("combined percentage rates must be below 1");
  });
});

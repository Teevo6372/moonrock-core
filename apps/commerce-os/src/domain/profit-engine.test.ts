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
    expect(result.breakEvenItemPrice).toBe("26.8657");
  });

  it("models a thirty percent promoted listing rate", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 1,
      expectedUnitSalePrice: "40",
      marketplaceFeeRate: "0.13",
      promotedListingRate: "0.30",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result).toMatchObject({
      expectedSellingCost: "25.2000",
      expectedNetProfit: "4.8000",
      roi: "0.4800",
      margin: "0.1200",
      breakEvenItemPrice: "31.5789",
    });
  });

  it("includes fixed marketplace fees once per expected order", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 1,
      expectedUnitSalePrice: "30",
      marketplaceFeeRate: "0.13",
      marketplaceFeeFixedPerOrder: "0.30",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result.expectedSellingCost).toBe("12.2000");
    expect(result.expectedNetProfit).toBe("7.8000");
    expect(result.breakEvenItemPrice).toBe("21.0345");
  });

  it("keeps payment fees separate from marketplace fees", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 1,
      expectedUnitSalePrice: "30",
      marketplaceFeeRate: "0.13",
      marketplaceFeeFixedPerOrder: "0.30",
      paymentFeeRate: "0.029",
      paymentFeeFixedPerOrder: "0.30",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result.expectedSellingCost).toBe("13.3700");
    expect(result.expectedNetProfit).toBe("6.6300");
    expect(result.breakEvenItemPrice).toBe("22.1165");
  });

  it("returns negative economics for a loss-making opportunity", () => {
    const result = calculateProfit({
      unitCost: "20",
      quantity: 1,
      expectedUnitSalePrice: "20",
      marketplaceFeeRate: "0.13",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result).toMatchObject({
      expectedNetProfit: "-10.6000",
      roi: "-0.5300",
      margin: "-0.5300",
      breakEvenItemPrice: "32.1839",
    });
  });

  it("returns zero profit at an exact break-even boundary", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 1,
      expectedUnitSalePrice: "18",
      outboundShippingPerOrder: "7",
      packagingCostPerOrder: "1",
    });

    expect(result.expectedNetProfit).toBe("0.0000");
    expect(result.breakEvenItemPrice).toBe("18.0000");
  });

  it("rounds half-up only when producing four-decimal outputs", () => {
    const result = calculateProfit({
      unitCost: "0.1",
      quantity: 1,
      expectedUnitSalePrice: "1",
      marketplaceFeeFixedPerOrder: "0.00005",
    });

    expect(result.expectedSellingCost).toBe("0.0001");
    expect(result.expectedNetProfit).toBe("0.9000");
    expect(result.breakEvenItemPrice).toBe("0.1001");
  });

  it("allocates acquisition cost and fixed costs across expected orders", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 3,
      expectedUnitsPerOrder: 2,
      inboundShippingTotal: "3",
      expectedUnitSalePrice: "20",
      marketplaceFeeFixedPerOrder: "1",
      outboundShippingPerOrder: "4",
    });

    expect(result).toMatchObject({
      expectedOrderCount: 2,
      acquisitionTotal: "33.0000",
      landedCostPerUnit: "11.0000",
      expectedGrossRevenue: "60.0000",
      expectedSellingCost: "10.0000",
      expectedNetProfit: "17.0000",
      breakEvenItemPrice: "14.3333",
    });
  });

  it("applies minimum net profit as a per-unit price threshold", () => {
    const result = calculateProfit({
      unitCost: "10",
      quantity: 2,
      expectedUnitSalePrice: "20",
      minimumNetProfit: "5",
    });

    expect(result.minimumAcceptableItemPrice).toBe("15.0000");
  });

  it("rejects zero acquisition cost", () => {
    expect(() =>
      calculateProfit({
        unitCost: "0",
        quantity: 1,
        expectedUnitSalePrice: "30",
      }),
    ).toThrow("acquisition total must be greater than zero");
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

    expect(() =>
      calculateProfit({
        unitCost: "10",
        quantity: 1,
        expectedUnitsPerOrder: 0,
        expectedUnitSalePrice: "30",
      }),
    ).toThrow("expectedUnitsPerOrder must be a positive integer");
  });
});

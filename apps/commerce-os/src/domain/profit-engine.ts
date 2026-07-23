import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type ProfitEngineInput = {
  unitCost: string;
  quantity: number;
  inboundShippingTotal?: string;
  acquisitionTaxTotal?: string;
  otherAcquisitionCostTotal?: string;
  expectedUnitSalePrice: string;
  buyerShippingRevenuePerUnit?: string;
  marketplaceFeeRate?: string;
  marketplaceFeeFixedPerOrder?: string;
  paymentFeeRate?: string;
  paymentFeeFixedPerOrder?: string;
  promotedListingRate?: string;
  outboundShippingPerOrder?: string;
  packagingCostPerOrder?: string;
  otherSellingCostPerOrder?: string;
  minimumNetProfit?: string;
  minimumRoi?: string;
};

export type ProfitEngineResult = {
  formulaVersion: "0.1.0";
  acquisitionTotal: string;
  landedCostPerUnit: string;
  expectedGrossRevenue: string;
  expectedSellingCost: string;
  expectedNetProfit: string;
  roi: string;
  margin: string;
  breakEvenItemPrice: string;
  minimumAcceptableItemPrice: string;
};

function decimal(value: string | undefined, fallback = "0"): Decimal {
  return new Decimal(value ?? fallback);
}

function assertNonNegative(name: string, value: Decimal): void {
  if (!value.isFinite() || value.isNegative()) {
    throw new Error(`${name} must be a non-negative finite decimal.`);
  }
}

function output(value: Decimal): string {
  return value.toDecimalPlaces(4).toFixed(4);
}

export function calculateProfit(input: ProfitEngineInput): ProfitEngineResult {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("quantity must be a positive integer.");
  }

  const quantity = new Decimal(input.quantity);
  const unitCost = decimal(input.unitCost);
  const inboundShipping = decimal(input.inboundShippingTotal);
  const acquisitionTax = decimal(input.acquisitionTaxTotal);
  const otherAcquisitionCost = decimal(input.otherAcquisitionCostTotal);
  const itemPrice = decimal(input.expectedUnitSalePrice);
  const buyerShipping = decimal(input.buyerShippingRevenuePerUnit);
  const marketplaceRate = decimal(input.marketplaceFeeRate);
  const marketplaceFixed = decimal(input.marketplaceFeeFixedPerOrder);
  const paymentRate = decimal(input.paymentFeeRate);
  const paymentFixed = decimal(input.paymentFeeFixedPerOrder);
  const promotedRate = decimal(input.promotedListingRate);
  const outboundShipping = decimal(input.outboundShippingPerOrder);
  const packaging = decimal(input.packagingCostPerOrder);
  const otherSellingCost = decimal(input.otherSellingCostPerOrder);
  const minimumNetProfit = decimal(input.minimumNetProfit);
  const minimumRoi = decimal(input.minimumRoi);

  const values = {
    unitCost,
    inboundShipping,
    acquisitionTax,
    otherAcquisitionCost,
    itemPrice,
    buyerShipping,
    marketplaceRate,
    marketplaceFixed,
    paymentRate,
    paymentFixed,
    promotedRate,
    outboundShipping,
    packaging,
    otherSellingCost,
    minimumNetProfit,
    minimumRoi,
  };

  for (const [name, value] of Object.entries(values)) {
    assertNonNegative(name, value);
  }

  const totalPercentageRate = marketplaceRate.plus(paymentRate).plus(promotedRate);
  if (marketplaceRate.greaterThanOrEqualTo(1) || paymentRate.greaterThanOrEqualTo(1)) {
    throw new Error("individual marketplace and payment rates must be below 1.");
  }
  if (totalPercentageRate.greaterThanOrEqualTo(1)) {
    throw new Error("combined percentage rates must be below 1.");
  }

  const merchandiseCost = unitCost.times(quantity);
  const acquisitionTotal = merchandiseCost
    .plus(inboundShipping)
    .plus(acquisitionTax)
    .plus(otherAcquisitionCost);

  if (acquisitionTotal.isZero()) {
    throw new Error("acquisition total must be greater than zero.");
  }

  const landedCostPerUnit = acquisitionTotal.dividedBy(quantity);
  const grossRevenuePerOrder = itemPrice.plus(buyerShipping);
  const expectedGrossRevenue = grossRevenuePerOrder.times(quantity);

  if (expectedGrossRevenue.isZero()) {
    throw new Error("expected gross revenue must be greater than zero.");
  }

  const sellingCostPerOrder = grossRevenuePerOrder
    .times(marketplaceRate.plus(paymentRate))
    .plus(itemPrice.times(promotedRate))
    .plus(marketplaceFixed)
    .plus(paymentFixed)
    .plus(outboundShipping)
    .plus(packaging)
    .plus(otherSellingCost);

  const expectedSellingCost = sellingCostPerOrder.times(quantity);
  const expectedNetProfit = expectedGrossRevenue
    .minus(acquisitionTotal)
    .minus(expectedSellingCost);
  const roi = expectedNetProfit.dividedBy(acquisitionTotal);
  const margin = expectedNetProfit.dividedBy(expectedGrossRevenue);

  const denominator = new Decimal(1).minus(totalPercentageRate);
  const fixedCostPerOrder = landedCostPerUnit
    .plus(marketplaceFixed)
    .plus(paymentFixed)
    .plus(outboundShipping)
    .plus(packaging)
    .plus(otherSellingCost);
  const shippingContribution = buyerShipping.times(
    new Decimal(1).minus(marketplaceRate).minus(paymentRate),
  );
  const breakEvenItemPrice = fixedCostPerOrder
    .minus(shippingContribution)
    .dividedBy(denominator);

  const requiredProfitTotal = Decimal.max(
    minimumNetProfit,
    acquisitionTotal.times(minimumRoi),
  );
  const requiredProfitPerUnit = requiredProfitTotal.dividedBy(quantity);
  const minimumAcceptableItemPrice = fixedCostPerOrder
    .plus(requiredProfitPerUnit)
    .minus(shippingContribution)
    .dividedBy(denominator);

  return {
    formulaVersion: "0.1.0",
    acquisitionTotal: output(acquisitionTotal),
    landedCostPerUnit: output(landedCostPerUnit),
    expectedGrossRevenue: output(expectedGrossRevenue),
    expectedSellingCost: output(expectedSellingCost),
    expectedNetProfit: output(expectedNetProfit),
    roi: output(roi),
    margin: output(margin),
    breakEvenItemPrice: output(breakEvenItemPrice),
    minimumAcceptableItemPrice: output(minimumAcceptableItemPrice),
  };
}

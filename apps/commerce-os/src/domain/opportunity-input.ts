import type { ProfitEngineInput } from "./profit-engine";

export const PRODUCT_TYPES = [
  "single_card",
  "sealed_product",
  "accessory",
  "bundle",
  "custom_deck",
] as const;

export type OpportunityInput = {
  opportunityId?: string;
  productId?: string;
  productName: string;
  productType: string;
  game: string;
  condition: string;
  supplierId?: string;
  supplierName: string;
  supplierUrl: string;
  quantity: number;
  unitCost: string;
  inboundShippingTotal: string;
  acquisitionTaxTotal: string;
  otherAcquisitionCostTotal: string;
  observedAt: string;
  evidenceReference: string;
  expectedUnitSalePrice: string;
  buyerShippingRevenuePerUnit: string;
  promotedListingRate: string;
  outboundShippingPerOrder: string;
  packagingCostPerOrder: string;
  otherSellingCostPerOrder: string;
  minimumNetProfit: string;
  minimumRoi: string;
};

export type FieldErrors = Partial<Record<keyof OpportunityInput, string>>;

export type ValidationResult =
  | { ok: true; value: OpportunityInput; warnings: string[] }
  | { ok: false; errors: FieldErrors; warnings: string[] };

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function value(formData: FormData, key: keyof OpportunityInput): string {
  return String(formData.get(key) ?? "").trim();
}

export function parseOpportunityForm(formData: FormData): OpportunityInput {
  return {
    opportunityId: value(formData, "opportunityId") || undefined,
    productId: value(formData, "productId") || undefined,
    productName: value(formData, "productName"),
    productType: value(formData, "productType"),
    game: value(formData, "game"),
    condition: value(formData, "condition"),
    supplierId: value(formData, "supplierId") || undefined,
    supplierName: value(formData, "supplierName"),
    supplierUrl: value(formData, "supplierUrl"),
    quantity: Number(value(formData, "quantity")),
    unitCost: value(formData, "unitCost"),
    inboundShippingTotal: value(formData, "inboundShippingTotal") || "0",
    acquisitionTaxTotal: value(formData, "acquisitionTaxTotal") || "0",
    otherAcquisitionCostTotal:
      value(formData, "otherAcquisitionCostTotal") || "0",
    observedAt: value(formData, "observedAt"),
    evidenceReference: value(formData, "evidenceReference"),
    expectedUnitSalePrice: value(formData, "expectedUnitSalePrice"),
    buyerShippingRevenuePerUnit:
      value(formData, "buyerShippingRevenuePerUnit") || "0",
    promotedListingRate: value(formData, "promotedListingRate") || "0",
    outboundShippingPerOrder:
      value(formData, "outboundShippingPerOrder") || "0",
    packagingCostPerOrder: value(formData, "packagingCostPerOrder") || "0",
    otherSellingCostPerOrder:
      value(formData, "otherSellingCostPerOrder") || "0",
    minimumNetProfit: value(formData, "minimumNetProfit") || "0",
    minimumRoi: value(formData, "minimumRoi") || "0",
  };
}

export function validateOpportunityInput(
  input: OpportunityInput,
  now = new Date(),
): ValidationResult {
  const errors: FieldErrors = {};
  const warnings: string[] = [];

  if (!input.productId && !input.productName) {
    errors.productName = "Select a product or enter a product name.";
  }
  if (
    !PRODUCT_TYPES.includes(input.productType as (typeof PRODUCT_TYPES)[number])
  ) {
    errors.productType = "Select a supported MVP product type.";
  }
  if (!input.condition) errors.condition = "Condition is required.";
  if (!input.supplierId && !input.supplierName) {
    errors.supplierName = "Select a supplier or enter a supplier name.";
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    errors.quantity = "Quantity must be a positive whole number.";
  }

  const decimals: Array<keyof OpportunityInput> = [
    "unitCost",
    "inboundShippingTotal",
    "acquisitionTaxTotal",
    "otherAcquisitionCostTotal",
    "expectedUnitSalePrice",
    "buyerShippingRevenuePerUnit",
    "promotedListingRate",
    "outboundShippingPerOrder",
    "packagingCostPerOrder",
    "otherSellingCostPerOrder",
    "minimumNetProfit",
    "minimumRoi",
  ];
  for (const key of decimals) {
    if (!DECIMAL_PATTERN.test(String(input[key]))) {
      errors[key] = "Enter a non-negative decimal without currency symbols.";
    }
  }
  if (DECIMAL_PATTERN.test(input.unitCost) && Number(input.unitCost) <= 0) {
    errors.unitCost = "Unit cost must be greater than zero.";
  }
  if (
    DECIMAL_PATTERN.test(input.expectedUnitSalePrice) &&
    Number(input.expectedUnitSalePrice) <= 0
  ) {
    errors.expectedUnitSalePrice =
      "Expected sale price must be greater than zero.";
  }
  if (
    DECIMAL_PATTERN.test(input.promotedListingRate) &&
    Number(input.promotedListingRate) >= 1
  ) {
    errors.promotedListingRate = "Promoted listing rate must be less than 1.";
  }

  const observedAt = new Date(input.observedAt);
  if (!input.observedAt || Number.isNaN(observedAt.valueOf())) {
    errors.observedAt = "A valid observation date and time is required.";
  } else {
    const ageDays = (now.valueOf() - observedAt.valueOf()) / 86_400_000;
    if (ageDays < -1)
      errors.observedAt = "Observation time cannot be in the future.";
    if (ageDays > 30) {
      warnings.push(
        "Supplier evidence is more than 30 days old; verify it before acting.",
      );
    }
  }

  return Object.keys(errors).length
    ? { ok: false, errors, warnings }
    : { ok: true, value: input, warnings };
}

export function toProfitEngineInput(
  input: OpportunityInput,
  feeProfile: {
    marketplaceFeeRate: string;
    marketplaceFeeFixed: string;
    paymentFeeRate: string;
    paymentFeeFixed: string;
  },
): ProfitEngineInput {
  return {
    unitCost: input.unitCost,
    quantity: input.quantity,
    inboundShippingTotal: input.inboundShippingTotal,
    acquisitionTaxTotal: input.acquisitionTaxTotal,
    otherAcquisitionCostTotal: input.otherAcquisitionCostTotal,
    expectedUnitSalePrice: input.expectedUnitSalePrice,
    buyerShippingRevenuePerUnit: input.buyerShippingRevenuePerUnit,
    marketplaceFeeRate: feeProfile.marketplaceFeeRate,
    marketplaceFeeFixedPerOrder: feeProfile.marketplaceFeeFixed,
    paymentFeeRate: feeProfile.paymentFeeRate,
    paymentFeeFixedPerOrder: feeProfile.paymentFeeFixed,
    promotedListingRate: input.promotedListingRate,
    outboundShippingPerOrder: input.outboundShippingPerOrder,
    packagingCostPerOrder: input.packagingCostPerOrder,
    otherSellingCostPerOrder: input.otherSellingCostPerOrder,
    minimumNetProfit: input.minimumNetProfit,
    minimumRoi: input.minimumRoi,
  };
}

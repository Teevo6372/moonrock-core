import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  calculateProfit,
  type ProfitEngineResult,
} from "@/domain/profit-engine";
import {
  toProfitEngineInput,
  type OpportunityInput,
} from "@/domain/opportunity-input";
import { prisma } from "@/lib/db";

export type OpportunityOptions = {
  products: Array<{ id: string; name: string; productType: string }>;
  suppliers: Array<{ id: string; name: string }>;
  marketplace: { id: string; name: string; feeProfileName: string };
};

type Db = PrismaClient | Prisma.TransactionClient;

async function currentContext(db: Db) {
  const [owner, marketplace] = await Promise.all([
    db.user.findUnique({ where: { email: "owner@localhost.invalid" } }),
    db.marketplace.findUnique({
      where: { name: "eBay" },
      include: {
        feeProfiles: {
          where: { effectiveTo: null },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    }),
  ]);
  const feeProfile = marketplace?.feeProfiles[0];
  if (!owner || !marketplace || !feeProfile) {
    throw new Error(
      "Seeded owner, eBay marketplace, or active fee profile is missing.",
    );
  }
  return { owner, marketplace, feeProfile };
}

export async function getOpportunityOptions(
  db: PrismaClient = prisma,
): Promise<OpportunityOptions> {
  const [products, suppliers, context] = await Promise.all([
    db.product.findMany({
      select: { id: true, name: true, productType: true },
      orderBy: { name: "asc" },
    }),
    db.supplier.findMany({
      where: { status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    currentContext(db),
  ]);
  return {
    products,
    suppliers,
    marketplace: {
      id: context.marketplace.id,
      name: context.marketplace.name,
      feeProfileName: context.feeProfile.name,
    },
  };
}

export async function persistOpportunity(
  input: OpportunityInput,
  warnings: string[],
  mode: "draft" | "evaluate",
  db: PrismaClient = prisma,
): Promise<{ opportunityId: string; calculation?: ProfitEngineResult }> {
  return db.$transaction(async (tx) => {
    const { owner, marketplace, feeProfile } = await currentContext(tx);
    const product = input.productId
      ? await tx.product.findUniqueOrThrow({ where: { id: input.productId } })
      : await tx.product.create({
          data: {
            category: "collectibles",
            game: input.game || "Magic: The Gathering",
            productType: input.productType,
            name: input.productName,
            conditionDefault: input.condition,
          },
        });
    const supplier = input.supplierId
      ? await tx.supplier.findUniqueOrThrow({ where: { id: input.supplierId } })
      : await tx.supplier.upsert({
          where: { name: input.supplierName },
          update: {
            websiteUrl: input.supplierUrl || undefined,
            status: "active",
          },
          create: {
            name: input.supplierName,
            supplierType: "manual",
            websiteUrl: input.supplierUrl || undefined,
            status: "active",
          },
        });
    const supplierOffer = await tx.supplierOffer.create({
      data: {
        productId: product.id,
        supplierId: supplier.id,
        sourceUrl: input.supplierUrl || undefined,
        condition: input.condition,
        unitCost: input.unitCost,
        availableQuantity: input.quantity,
        inboundShippingTotal: input.inboundShippingTotal,
        estimatedTaxTotal: input.acquisitionTaxTotal,
        otherCostTotal: input.otherAcquisitionCostTotal,
        observedAt: new Date(input.observedAt),
        evidenceReference: input.evidenceReference || undefined,
      },
    });
    const opportunity = input.opportunityId
      ? await tx.opportunity.update({
          where: { id: input.opportunityId },
          data: {
            productId: product.id,
            supplierOfferId: supplierOffer.id,
            targetMarketplaceId: marketplace.id,
            status: mode === "evaluate" ? "evaluated" : "draft",
            quantity: input.quantity,
            expectedUnitSalePrice: input.expectedUnitSalePrice,
            buyerShippingRevenuePerUnit: input.buyerShippingRevenuePerUnit,
            outboundShippingPerOrder: input.outboundShippingPerOrder,
            packagingCostPerOrder: input.packagingCostPerOrder,
            otherSellingCostPerOrder: input.otherSellingCostPerOrder,
          },
        })
      : await tx.opportunity.create({
          data: {
            productId: product.id,
            supplierOfferId: supplierOffer.id,
            targetMarketplaceId: marketplace.id,
            status: mode === "evaluate" ? "evaluated" : "draft",
            quantity: input.quantity,
            expectedUnitSalePrice: input.expectedUnitSalePrice,
            buyerShippingRevenuePerUnit: input.buyerShippingRevenuePerUnit,
            outboundShippingPerOrder: input.outboundShippingPerOrder,
            packagingCostPerOrder: input.packagingCostPerOrder,
            otherSellingCostPerOrder: input.otherSellingCostPerOrder,
            createdById: owner.id,
          },
        });

    if (mode === "draft") return { opportunityId: opportunity.id };

    const feeAssumptions = {
      feeProfileId: feeProfile.id,
      feeProfileName: feeProfile.name,
      marketplaceFeeRate: feeProfile.marketplaceFeeRate.toString(),
      marketplaceFeeFixed: feeProfile.marketplaceFeeFixed.toString(),
      paymentFeeRate: feeProfile.paymentFeeRate.toString(),
      paymentFeeFixed: feeProfile.paymentFeeFixed.toString(),
    };
    const engineInput = toProfitEngineInput(input, feeAssumptions);
    const calculation = calculateProfit(engineInput);
    await tx.calculationRun.create({
      data: {
        opportunityId: opportunity.id,
        formulaVersion: calculation.formulaVersion,
        inputSnapshotJson: JSON.stringify(engineInput),
        assumptionSnapshotJson: JSON.stringify({
          marketplaceId: marketplace.id,
          marketplaceName: marketplace.name,
          ...feeAssumptions,
        }),
        acquisitionTotal: calculation.acquisitionTotal,
        landedCostPerUnit: calculation.landedCostPerUnit,
        expectedGrossRevenue: calculation.expectedGrossRevenue,
        expectedSellingCost: calculation.expectedSellingCost,
        expectedNetProfit: calculation.expectedNetProfit,
        roi: calculation.roi,
        margin: calculation.margin,
        breakEvenPrice: calculation.breakEvenItemPrice,
        minimumAcceptablePrice: calculation.minimumAcceptableItemPrice,
        warningsJson: JSON.stringify(warnings),
      },
    });
    return { opportunityId: opportunity.id, calculation };
  });
}

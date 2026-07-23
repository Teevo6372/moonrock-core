import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { OpportunityInput } from "@/domain/opportunity-input";

vi.mock("server-only", () => ({}));

const db = new PrismaClient();
const marker = `vitest-${Date.now()}`;
const input: OpportunityInput = {
  productName: `Test product ${marker}`,
  productType: "sealed_product",
  game: "Magic: The Gathering",
  condition: "New",
  supplierName: `Test supplier ${marker}`,
  supplierUrl: "https://supplier.invalid/test",
  quantity: 2,
  unitCost: "100",
  inboundShippingTotal: "5",
  acquisitionTaxTotal: "0",
  otherAcquisitionCostTotal: "0",
  observedAt: "2026-07-23T12:00:00.000Z",
  evidenceReference: "Automated integration fixture",
  expectedUnitSalePrice: "160",
  buyerShippingRevenuePerUnit: "0",
  promotedListingRate: "0.05",
  outboundShippingPerOrder: "7",
  packagingCostPerOrder: "0.5",
  otherSellingCostPerOrder: "0",
  minimumNetProfit: "0",
  minimumRoi: "0.30",
};

describe.skipIf(!process.env.DATABASE_URL)("opportunity persistence", () => {
  beforeAll(async () => {
    expect(
      await db.user.findUnique({ where: { email: "owner@localhost.invalid" } }),
    ).not.toBeNull();
  });

  afterAll(async () => {
    const products = await db.product.findMany({
      where: { name: { contains: marker } },
      select: { id: true },
    });
    const productIds = products.map(({ id }) => id);
    const opportunities = await db.opportunity.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    });
    const opportunityIds = opportunities.map(({ id }) => id);
    await db.calculationRun.deleteMany({
      where: { opportunityId: { in: opportunityIds } },
    });
    await db.opportunity.deleteMany({ where: { id: { in: opportunityIds } } });
    await db.supplierOffer.deleteMany({
      where: { productId: { in: productIds } },
    });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    await db.supplier.deleteMany({ where: { name: { contains: marker } } });
    await db.$disconnect();
  });

  it("persists normalized data and appends calculation history", async () => {
    const { persistOpportunity } = await import("./opportunity-service");
    const first = await persistOpportunity(input, [], "evaluate", db);
    expect(first.calculation?.expectedNetProfit).toBeDefined();

    const stored = await db.opportunity.findUniqueOrThrow({
      where: { id: first.opportunityId },
      include: { product: true, supplierOffer: true, calculationRuns: true },
    });
    expect(stored.product.name).toBe(input.productName);
    expect(stored.supplierOffer?.unitCost.toString()).toBe("100");
    expect(stored.calculationRuns).toHaveLength(1);
    expect(
      JSON.parse(stored.calculationRuns[0].assumptionSnapshotJson),
    ).toMatchObject({ marketplaceFeeRate: "0.13", marketplaceName: "eBay" });

    await persistOpportunity(
      {
        ...input,
        opportunityId: first.opportunityId,
        productId: stored.productId,
      },
      ["re-evaluation"],
      "evaluate",
      db,
    );
    expect(
      await db.calculationRun.count({
        where: { opportunityId: first.opportunityId },
      }),
    ).toBe(2);
  });

  it("rolls back a product created before a supplier lookup fails", async () => {
    const { persistOpportunity } = await import("./opportunity-service");
    const failedName = `Rollback product ${marker}`;
    await expect(
      persistOpportunity(
        {
          ...input,
          productName: failedName,
          supplierId: "missing-supplier",
          supplierName: "",
        },
        [],
        "evaluate",
        db,
      ),
    ).rejects.toThrow();
    expect(
      await db.product.findFirst({ where: { name: failedName } }),
    ).toBeNull();
  });
});

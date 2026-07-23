import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@localhost.invalid" },
    update: { displayName: "Stephen Tyler Jr.", role: "owner", status: "active" },
    create: {
      email: "owner@localhost.invalid",
      displayName: "Stephen Tyler Jr.",
      role: "owner",
      status: "active",
    },
  });

  const ebay = await prisma.marketplace.upsert({
    where: { name: "eBay" },
    update: { channelType: "marketplace", status: "active" },
    create: { name: "eBay", channelType: "marketplace", status: "active" },
  });

  await prisma.feeProfile.upsert({
    where: {
      marketplaceId_name_effectiveFrom: {
        marketplaceId: ebay.id,
        name: "Initial editable eBay assumptions",
        effectiveFrom: new Date("2026-07-22T00:00:00.000Z"),
      },
    },
    update: {},
    create: {
      marketplaceId: ebay.id,
      name: "Initial editable eBay assumptions",
      marketplaceFeeRate: "0.13",
      marketplaceFeeFixed: "0",
      paymentFeeRate: "0",
      paymentFeeFixed: "0",
      promotedListingRateDefault: "0",
      feeBasisNotes: "Seed values are editable assumptions, not permanent constants.",
      effectiveFrom: new Date("2026-07-22T00:00:00.000Z"),
    },
  });

  console.log(`Seeded Commerce OS owner ${owner.displayName} and eBay defaults.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

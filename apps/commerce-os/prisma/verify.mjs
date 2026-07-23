import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [owner, marketplace, feeProfile] = await Promise.all([
    prisma.user.findUnique({ where: { email: "owner@localhost.invalid" } }),
    prisma.marketplace.findUnique({ where: { name: "eBay" } }),
    prisma.feeProfile.findFirst({
      where: { name: "Initial editable eBay assumptions" },
    }),
  ]);

  if (!owner || !marketplace || !feeProfile) {
    throw new Error("Required Commerce OS seed records are missing.");
  }

  await prisma.$queryRaw`SELECT 1`;
  console.log("Commerce OS database bootstrap verified.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

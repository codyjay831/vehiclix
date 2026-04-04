import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const vehicles = await db.vehicle.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      vin: true,
      make: true,
      model: true,
      slug: true,
      vehicleStatus: true,
      createdAt: true
    }
  });

  console.log(JSON.stringify(vehicles, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

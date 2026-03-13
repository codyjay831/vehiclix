import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, vin: true, make: true, model: true, organizationId: true }
  });
  console.log("Current Vehicles in DB:");
  vehicles.forEach(v => {
    console.log(`VIN: ${v.vin} | Make: ${v.make} | Org: ${v.organizationId}`);
  });
}

checkVehicles()
  .then(() => prisma.$disconnect());

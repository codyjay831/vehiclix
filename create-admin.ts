import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from 'bcryptjs';
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'cody@vehiclix.app';
  const password = 'theadmin123';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`Creating platform admin user: ${email}...`);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.SUPER_ADMIN,
      passwordHash,
      firstName: 'Cody',
      lastName: 'Admin',
      isStub: false,
    },
    create: {
      email,
      role: Role.SUPER_ADMIN,
      passwordHash,
      firstName: 'Cody',
      lastName: 'Admin',
      isStub: false,
    },
  });

  console.log('✅ User created/updated successfully:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   ID: ${user.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

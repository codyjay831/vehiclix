import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { RESERVED_SLUGS } from "../src/lib/constants";

/** Same rules as `src/lib/organization.normalizeSlug` (script must not import `@/lib/db`). */
const repoRoot = process.cwd();
dotenv.config({ path: resolve(repoRoot, ".env") });
dotenv.config({ path: resolve(repoRoot, ".env.local"), override: true });
dotenv.config({ path: resolve(repoRoot, ".env.production.local"), override: true });

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateDealerSlug(raw: string): { ok: true; slug: string } | { ok: false; error: string } {
  const slug = normalizeSlug(raw.trim().replace(/^\/+/, ""));
  if (slug.length < 3) {
    return { ok: false, error: "Slug must be at least 3 characters long." };
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return { ok: false, error: `Slug "${slug}" is reserved and cannot be used.` };
  }
  return { ok: true, slug };
}

/**
 * VEHICLIX PILOT ONBOARDING UTILITY
 *
 * Usage:
 * DEALER_NAME="Dealer Name" DEALER_SLUG="dealer-slug" ADMIN_EMAIL="admin@dealer.com" ADMIN_PASSWORD="password" npx tsx scripts/onboard-dealer.ts
 *
 * Example (Evo Motors):
 * DEALER_NAME="Evo Motors" DEALER_SLUG="evomotorsinc" ADMIN_EMAIL="admin@evomotorsinc.com" ADMIN_PASSWORD="..." npm run onboard:dealer
 */

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const name = process.env.DEALER_NAME?.trim();
  const slugRaw = process.env.DEALER_SLUG;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !slugRaw || !email || !password) {
    console.error("❌ Missing required environment variables:");
    console.error("   DEALER_NAME, DEALER_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD");
    process.exit(1);
  }

  const slugCheck = validateDealerSlug(slugRaw);
  if (!slugCheck.ok) {
    console.error(`❌ Invalid slug: ${slugCheck.error}`);
    process.exit(1);
  }
  const slug = slugCheck.slug;

  console.log(`🚀 Starting onboarding for: ${name} (${slug})...`);

  try {
    // 1. Create Organization
    const organization = await prisma.organization.upsert({
      where: { slug },
      update: { name },
      create: {
        name,
        slug,
      },
    });

    console.log(`✅ Organization created/updated: ${organization.name} (${organization.id})`);

    // 2. Create Owner User
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        firstName: name.split(' ')[0],
        lastName: "Admin",
        role: Role.OWNER,
        passwordHash,
        isStub: false,
        organizationId: organization.id,
      },
      create: {
        email: email.toLowerCase(),
        firstName: name.split(' ')[0],
        lastName: "Admin",
        role: Role.OWNER,
        passwordHash,
        isStub: false,
        organizationId: organization.id,
      },
    });

    console.log(`✅ Owner user created/updated successfully:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Organization ID: ${organization.id}`);
    
    console.log("\n--------------------------------------------------");
    console.log("PILOT ONBOARDING SUCCESSFUL");
    console.log("--------------------------------------------------");
    console.log("Next steps for Pilot Verification:");
    console.log(`1. Log in at /login with ${email}`);
    console.log("2. Verify the Admin Dashboard is empty");
    console.log("3. Create a test vehicle and ensure it stays isolated");
    console.log("--------------------------------------------------\n");

  } catch (error) {
    console.error("❌ Onboarding failed:", error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

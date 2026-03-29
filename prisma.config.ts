import dotenv from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

const repoRoot = process.cwd();

dotenv.config({ path: resolve(repoRoot, ".env"), override: true });
dotenv.config({ path: resolve(repoRoot, ".env.local"), override: true });

const prismaUrl =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

if (!prismaUrl) {
  throw new Error(
    "Prisma CLI requires one of: DIRECT_URL, POSTGRES_PRISMA_URL, or DATABASE_URL.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: prismaUrl,
  },
});

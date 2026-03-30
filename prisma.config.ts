import { resolve } from "node:path";
import { defineConfig } from "prisma/config";
import { loadEnv } from "./scripts/env-loader";

const repoRoot = process.cwd();

// Default to 'local' for prisma CLI, but allow env-based override for CI/Docker
const target = (process.env.PRISMA_TARGET as 'local' | 'docker' | 'production') || 'local';
loadEnv(target);

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

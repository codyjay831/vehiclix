// Prisma CLI reads datasource URL from here (not schema.prisma).
import dotenv from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

const repoRoot = process.cwd();

/**
 * Dotenv default is override: false — variables already set in the process (e.g. Windows
 * User/System DATABASE_URL) win over `.env`. That makes `npx prisma migrate` hit production
 * Cloud SQL private IPs while `.env` still says 127.0.0.1.
 *
 * When NODE_ENV is `production`, do not override: Cloud Run / CI inject DATABASE_URL.
 * Migration images set NODE_ENV=production and omit `.env` (.dockerignore).
 */
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: resolve(repoRoot, ".env") });
} else {
  dotenv.config({ path: resolve(repoRoot, ".env"), override: true });
  dotenv.config({ path: resolve(repoRoot, ".env.local"), override: true });
}

/**
 * Skip local-dev private-IP guard when Prisma runs in production or known remote builders.
 * `npm run build` runs `prisma generate` before `next build`, so NODE_ENV is often still
 * unset during generate even though the host (e.g. Firebase App Hosting) injects a valid
 * VPC-only Cloud SQL DATABASE_URL.
 */
function isRemoteOrProductionPrismaContext(): boolean {
  if (process.env.NODE_ENV === "production") return true;
  // Firebase App Hosting: auto-injected at build (and related) — see Firebase App Hosting docs.
  if (process.env.FIREBASE_CONFIG) return true;
  if (process.env.FIREBASE_WEBAPP_CONFIG) return true;
  // Cloud Native Buildpacks (Firebase App Hosting / GCP source builds use CNB).
  if (process.env.CNB_PLATFORM_API) return true;
  if (process.env.CI === "true" || process.env.CI === "1") return true;
  if (process.env.K_SERVICE) return true;
  return false;
}

/** Same rules as `src/lib/db.ts` — block silent use of RFC1918 literals in non-production. */
function isPrivateIpv4Literal(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function assertPrismaDatabaseUrlSafeForLocalTooling(url: string | undefined): void {
  if (!url) return;
  if (isRemoteOrProductionPrismaContext()) return;
  if (process.env.ALLOW_PRIVATE_DATABASE_URL_IN_DEV === "true") return;

  try {
    const u = new URL(url.replace(/^postgresql:/i, "http:"));
    const host = u.hostname;
    if (isPrivateIpv4Literal(host)) {
      throw new Error(
        `Prisma CLI: DATABASE_URL uses private IP "${host}". ` +
          "On Windows, a User or System DATABASE_URL often overrides `.env` unless prisma.config.ts uses dotenv override (this file does when NODE_ENV is not production). " +
          "Remove DATABASE_URL from: System Properties → Environment Variables, or PowerShell session, then reopen the terminal. " +
          "Or set ALLOW_PRIVATE_DATABASE_URL_IN_DEV=true only with VPN / Cloud SQL Auth Proxy to a local port.",
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Prisma CLI:")) throw e;
  }
}

const databaseUrl = process.env.DATABASE_URL;
assertPrismaDatabaseUrlSafeForLocalTooling(databaseUrl);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});

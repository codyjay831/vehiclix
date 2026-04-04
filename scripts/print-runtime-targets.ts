/**
 * Prints database hostnames and storage mode — no passwords.
 * Uses the same dotenv file order as prisma.config.ts (via loadEnv + PRISMA_TARGET).
 *
 * Run: npm run env:print-targets
 * Or:  PRISMA_TARGET=docker npm run env:print-targets
 */

import { loadEnv } from "./env-loader";

const target =
  (process.env.PRISMA_TARGET as "local" | "docker" | "production") || "local";
loadEnv(target);

function hostLine(raw: string | undefined, label: string): string {
  if (!raw?.trim()) return `${label}: (unset)`;
  try {
    const u = new URL(raw.replace(/^postgresql:/i, "http:"));
    const db = (u.pathname || "").replace(/^\//, "").split("?")[0] || "(default)";
    return `${label}: host=${u.host} database=${db}`;
  } catch {
    return `${label}: (could not parse URL)`;
  }
}

const prismaEffective =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;

let prismaHost = "(none)";
try {
  if (prismaEffective?.trim()) {
    const u = new URL(prismaEffective.replace(/^postgresql:/i, "http:"));
    prismaHost = u.host;
  }
} catch {
  prismaHost = "(unparseable)";
}

const useConnector = process.env.USE_CLOUD_SQL_CONNECTOR === "true";
const inferredStorage =
  process.env.STORAGE_PROVIDER ||
  (process.env.GCS_BUCKET_NAME ? "gcs" : "local");

console.log("");
console.log("=== Vehiclix / Evo Motors — runtime targets (no secrets) ===");
console.log("");
if (
  target === "local" &&
  (prismaHost.includes("neon.tech") || prismaHost.includes("neon.database"))
) {
  console.warn(
    "⚠️  WARNING: Prisma URL host looks like Neon while PRISMA_TARGET=local. Remove DATABASE_URL / DIRECT_URL / POSTGRES_* from .env.local for Docker-only dev.",
  );
  console.log("");
}
console.log(`PRISMA_TARGET: ${target}  (env-loader: .env then .env.local, or .env.docker, or .env.production.local)`);
console.log("");
console.log("--- URLs (Prisma CLI uses first set: DIRECT_URL → POSTGRES_PRISMA_URL → DATABASE_URL) ---");
console.log(hostLine(process.env.DIRECT_URL, "DIRECT_URL"));
console.log(hostLine(process.env.POSTGRES_PRISMA_URL, "POSTGRES_PRISMA_URL"));
console.log(hostLine(process.env.DATABASE_URL, "DATABASE_URL"));
console.log(`→ Prisma CLI effective host: ${prismaHost}`);
console.log("");
console.log("--- Next.js app pool (src/lib/db.ts) ---");
console.log(`USE_CLOUD_SQL_CONNECTOR: ${useConnector}`);
if (useConnector) {
  console.log(
    "→ App uses Cloud SQL connector + DB_USER / DB_PASSWORD / DB_NAME (not DATABASE_URL for the pool).",
  );
} else {
  console.log(hostLine(process.env.DATABASE_URL, "DATABASE_URL (used by app)"));
}
console.log("");
console.log("--- Storage (src/lib/storage/index.ts) ---");
console.log(`STORAGE_PROVIDER: ${process.env.STORAGE_PROVIDER || "(unset)"}`);
console.log(`GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME || "(unset)"}`);
console.log(`→ Effective mode: ${inferredStorage}`);
console.log("");
console.log("--- Local provider paths (when mode is local, non-VERCEL) ---");
console.log("  Vehicle images: public/uploads/inventory/");
console.log("  Private docs:   storage/documents/");
console.log("");

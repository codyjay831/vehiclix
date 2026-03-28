import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";

/** Legacy fallback; prefer CLOUD_SQL_INSTANCE_CONNECTION_NAME or INSTANCE_CONNECTION_NAME env vars. */
const DEFAULT_INSTANCE_CONNECTION_NAME = "vehiclix-f8be6:us-east4:vehiclix-db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

async function createPrismaClient(): Promise<PrismaClient> {
  if (process.env.NODE_ENV === "production" && globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const useConnector = process.env.USE_CLOUD_SQL_CONNECTOR === "true";

  let pool: Pool;

  if (useConnector) {
    const password = process.env.DB_PASSWORD;
    if (!password) {
      throw new Error("DB_PASSWORD is required when USE_CLOUD_SQL_CONNECTOR=true");
    }
    const instanceConnectionName =
      process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME ||
      process.env.INSTANCE_CONNECTION_NAME ||
      DEFAULT_INSTANCE_CONNECTION_NAME;
    const user = process.env.DB_USER || "postgres";
    const database = process.env.DB_NAME || process.env.POSTGRES_DB || "vehiclix";
    const connector = new Connector();
    const clientOpts = await connector.getOptions({
      instanceConnectionName,
      ipType: IpAddressTypes.PRIVATE,
    });
    pool = new Pool({
      ...clientOpts,
      user,
      password,
      database,
    });
  } else {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when USE_CLOUD_SQL_CONNECTOR is not "true"');
    }
    pool = new Pool({ connectionString });
  }

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV === "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const db = await createPrismaClient();

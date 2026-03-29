import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** True if hostname is a literal IPv4 address in RFC1918 private space (unreachable from typical local dev machines). */
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

function assertDevDatabaseUrlIsLocallyReachable(connectionString: string): void {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.ALLOW_PRIVATE_DATABASE_URL_IN_DEV === "true") return;

  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, "http:"));
    const host = u.hostname;
    if (isPrivateIpv4Literal(host)) {
      throw new Error(
        `DATABASE_URL points at a private IP (${host}), which is not reachable from this machine in local Next.js dev. ` +
          "Use Postgres on 127.0.0.1 (e.g. Docker: docker compose up postgres), Cloud SQL Auth Proxy to a local port, or set ALLOW_PRIVATE_DATABASE_URL_IN_DEV=true if you truly have VPN/VPC routing. " +
          "Do not copy production Cloud SQL private IPs into .env for local work."
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("DATABASE_URL points")) throw e;
    throw new Error(
      `DATABASE_URL could not be parsed for local dev safety check: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

async function createPrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const useConnector = process.env.USE_CLOUD_SQL_CONNECTOR === "true";

  if (
    useConnector &&
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_CLOUD_SQL_CONNECTOR_IN_DEV !== "true"
  ) {
    throw new Error(
      "USE_CLOUD_SQL_CONNECTOR=true is not supported in local Next.js dev without VPC reachability to Cloud SQL private IP. " +
        'Unset USE_CLOUD_SQL_CONNECTOR (or set it to anything other than "true") and use DATABASE_URL pointing at reachable Postgres ' +
        "(e.g. Cloud SQL Auth Proxy to 127.0.0.1). See DEPLOY_VEHICLIX_GOOGLE.md. " +
        "To opt in anyway, set ALLOW_CLOUD_SQL_CONNECTOR_IN_DEV=true."
    );
  }

  let pool: Pool;

  if (useConnector) {
    const password = process.env.DB_PASSWORD;
    if (!password) {
      throw new Error("DB_PASSWORD is required when USE_CLOUD_SQL_CONNECTOR=true");
    }
    const instanceConnectionName =
      process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME || process.env.INSTANCE_CONNECTION_NAME;
    if (!instanceConnectionName) {
      throw new Error(
        "CLOUD_SQL_INSTANCE_CONNECTION_NAME or INSTANCE_CONNECTION_NAME is required when USE_CLOUD_SQL_CONNECTOR=true " +
          "(no default instance is configured in code)."
      );
    }
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
    assertDevDatabaseUrlIsLocallyReachable(connectionString);
    pool = new Pool({ connectionString });
  }

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  globalForPrisma.prisma = client;

  return client;
}

export const db = await createPrismaClient();

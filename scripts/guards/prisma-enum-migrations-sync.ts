/**
 * Fails if PostgreSQL enum values implied by prisma migration SQL files
 * do not match enum blocks in prisma/schema.prisma.
 *
 * Catches schema/client-ahead-of-DB drift without a live database or shadow DB
 * (Prisma 7 migrate diff --from-migrations requires shadow configuration).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const schemaPath = path.join(root, "prisma", "schema.prisma");
const migrationsDir = path.join(root, "prisma", "migrations");

function parseSchemaEnums(text: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const re = /enum\s+(\w+)\s*\{([^}]*)\}/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    const body = m[2];
    const values = new Set<string>();
    for (const line of body.split(/\r?\n/)) {
      const stripped = line.replace(/\/\/.*$/, "").trim();
      if (!stripped || stripped.startsWith("@@")) continue;
      values.add(stripped);
    }
    out.set(name, values);
  }
  return out;
}

function parseQuotedEnumList(inner: string): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < inner.length) {
    while (i < inner.length && /\s|,/.test(inner[i]!)) i++;
    if (i >= inner.length) break;
    if (inner[i] !== "'") {
      throw new Error(`Unexpected enum token in: ${inner.slice(i, i + 40)}`);
    }
    i++;
    let token = "";
    while (i < inner.length && inner[i] !== "'") {
      token += inner[i]!;
      i++;
    }
    if (inner[i] !== "'") throw new Error(`Unterminated enum literal in: ${inner}`);
    i++;
    parts.push(token);
  }
  return parts;
}

function collectMigrationEnumState(): Map<string, Set<string>> {
  const state = new Map<string, Set<string>>();
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory missing: ${migrationsDir}`);
  }
  const dirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d/.test(d.name))
    .map((d) => d.name)
    .sort();

  const createRe =
    /CREATE\s+TYPE\s+"(\w+)"\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  const alterRe =
    /ALTER\s+TYPE\s+"(\w+)"\s+ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([^']+)'/gi;

  for (const dir of dirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, "utf8");

    let m: RegExpExecArray | null;
    createRe.lastIndex = 0;
    while ((m = createRe.exec(sql)) !== null) {
      const typeName = m[1]!;
      const vals = parseQuotedEnumList(m[2]!);
      state.set(typeName, new Set(vals));
    }

    alterRe.lastIndex = 0;
    while ((m = alterRe.exec(sql)) !== null) {
      const typeName = m[1]!;
      const val = m[2]!;
      const set = state.get(typeName) ?? new Set<string>();
      set.add(val);
      state.set(typeName, set);
    }
  }
  return state;
}

function main() {
  const schemaText = fs.readFileSync(schemaPath, "utf8");
  const schemaEnums = parseSchemaEnums(schemaText);
  const migrationEnums = collectMigrationEnumState();

  const errors: string[] = [];

  for (const [name, schemaVals] of schemaEnums) {
    const migVals = migrationEnums.get(name);
    if (!migVals) {
      errors.push(
        `Enum "${name}" exists in schema.prisma but has no CREATE TYPE "..." in migrations (add a migration).`,
      );
      continue;
    }
    for (const v of schemaVals) {
      if (!migVals.has(v)) {
        errors.push(
          `Enum "${name}": value "${v}" is in schema.prisma but not produced by migrations (missing CREATE/ALTER TYPE in prisma/migrations).`,
        );
      }
    }
    for (const v of migVals) {
      if (!schemaVals.has(v)) {
        errors.push(
          `Enum "${name}": value "${v}" appears in migrations but not in schema.prisma (stale migration or schema out of sync).`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error("prisma-enum-migrations-sync: FAILED\n");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(
    `prisma-enum-migrations-sync: OK (${schemaEnums.size} enums checked vs migrations).`,
  );
}

main();

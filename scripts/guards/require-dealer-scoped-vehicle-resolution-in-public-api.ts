/**
 * Guard: public API v1 must resolve vehicles only via dealer-scoped inventory helpers.
 *
 * Forbids in src/app/api/v1/public/ (all .ts files, recursive):
 * - getPublicVehicleDetail( — id-primary-only detail helper (use getPublicVehicleDetailBySlugOrId)
 * - Direct Prisma/db vehicle access: db.vehicle, prisma.vehicle
 *
 * Run: npx tsx scripts/guards/require-dealer-scoped-vehicle-resolution-in-public-api.ts
 *
 * Default: blocking (exit 1 on violation).
 * PUBLIC_VEHICLE_SCOPE_GUARD_WARN=1: print only, exit 0.
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");
const SCAN_ROOT = path.join(REPO_ROOT, "src/app/api/v1/public");

/** Old helper: single id lookup without slug-first (not allowed in v1 public). */
const RE_ID_ONLY_DETAIL = /\bgetPublicVehicleDetail\s*\(/;

/** Must not be substring of getPublicVehicleDetailBySlugOrId — that has 'B' after 'Detail'. */
function lineHasIdOnlyDetail(line: string): boolean {
  const stripped = line.replace(/\/\/.*$/, "");
  if (!RE_ID_ONLY_DETAIL.test(stripped)) return false;
  return !/\bgetPublicVehicleDetailBySlugOrId\s*\(/.test(stripped);
}

const RE_DB_VEHICLE = /\bdb\.vehicle\b/;
const RE_PRISMA_VEHICLE = /\bprisma\.vehicle\b/;

interface Finding {
  file: string;
  line: number;
  rule: string;
  text: string;
}

function walkTsFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsFiles(full, out);
    else if (ent.isFile() && ent.name.endsWith(".ts")) out.push(full);
  }
}

function scanFile(file: string, findings: Finding[]): void {
  const rel = path.relative(REPO_ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, idx) => {
    const code = line.replace(/\/\/.*$/, "").trim();
    if (!code) return;
    if (lineHasIdOnlyDetail(line)) {
      findings.push({
        file: rel,
        line: idx + 1,
        rule: "getPublicVehicleDetail( — use getPublicVehicleDetailBySlugOrId(organization.id, …)",
        text: line.trim(),
      });
    }
    if (RE_DB_VEHICLE.test(code)) {
      findings.push({
        file: rel,
        line: idx + 1,
        rule: "db.vehicle — use scoped helpers from @/lib/inventory",
        text: line.trim(),
      });
    }
    if (RE_PRISMA_VEHICLE.test(code)) {
      findings.push({
        file: rel,
        line: idx + 1,
        rule: "prisma.vehicle — use scoped helpers from @/lib/inventory",
        text: line.trim(),
      });
    }
  });
}

function main(): void {
  const warnOnly = process.env.PUBLIC_VEHICLE_SCOPE_GUARD_WARN === "1";
  const files: string[] = [];
  walkTsFiles(SCAN_ROOT, files);

  const findings: Finding[] = [];
  for (const f of files.sort()) scanFile(f, findings);

  if (findings.length === 0) {
    console.log(
      `[guard:public-vehicle-scope] OK — ${files.length} public route file(s); dealer-scoped vehicle resolution patterns.`
    );
    process.exit(0);
  }

  console.error(`[guard:public-vehicle-scope] FAIL — ${findings.length} violation(s)\n`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  ${f.rule}`);
    console.error(`    ${f.text}`);
  }

  if (warnOnly) {
    console.error("\n[WARN MODE] PUBLIC_VEHICLE_SCOPE_GUARD_WARN=1 — exiting 0.");
    process.exit(0);
  }
  process.exit(1);
}

main();

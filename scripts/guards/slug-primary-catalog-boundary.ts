/**
 * Guard: public catalog boundary stays slug-primary (id fallback inside helper only).
 *
 * Checks:
 * 1) VDP route uses getPublicVehicleDetailBySlugOrId(organization.id, …).
 * 2) No id-only getPublicVehicleDetail( in that route.
 * 3) public-vehicle-card / public-vehicle-detail DTOs expose slug: string | null (public identity).
 *
 * Run: npx tsx scripts/guards/slug-primary-catalog-boundary.ts
 *
 * Default: blocking. SLUG_PRIMARY_GUARD_WARN=1: warn only, exit 0.
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");

const VDP_ROUTE = path.join(
  REPO_ROOT,
  "src/app/api/v1/public/catalog/[vehicleId]/route.ts"
);
const DTO_CARD = path.join(REPO_ROOT, "src/lib/api/dto/public-vehicle-card.ts");
const DTO_DETAIL = path.join(REPO_ROOT, "src/lib/api/dto/public-vehicle-detail.ts");

interface Issue {
  file: string;
  message: string;
}

function lineHasIdOnlyDetail(line: string): boolean {
  const stripped = line.replace(/\/\/.*$/, "");
  if (!/\bgetPublicVehicleDetail\s*\(/.test(stripped)) return false;
  return !/\bgetPublicVehicleDetailBySlugOrId\s*\(/.test(stripped);
}

function main(): void {
  const warnOnly = process.env.SLUG_PRIMARY_GUARD_WARN === "1";
  const issues: Issue[] = [];

  if (!fs.existsSync(VDP_ROUTE)) {
    issues.push({ file: "src/app/api/v1/public/catalog/[vehicleId]/route.ts", message: "VDP route file missing" });
  } else {
    const rel = path.relative(REPO_ROOT, VDP_ROUTE);
    const vdp = fs.readFileSync(VDP_ROUTE, "utf8");
    if (!vdp.includes("getPublicVehicleDetailBySlugOrId(organization.id")) {
      issues.push({
        file: rel,
        message: "Must call getPublicVehicleDetailBySlugOrId(organization.id, …) for dealer-scoped slug/id lookup",
      });
    }
    const lines = vdp.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (lineHasIdOnlyDetail(line)) {
        issues.push({
          file: rel,
          message: `Line ${i + 1}: do not use getPublicVehicleDetail( — use getPublicVehicleDetailBySlugOrId`,
        });
      }
    });
  }

  for (const [label, p] of [
    ["public-vehicle-card", DTO_CARD],
    ["public-vehicle-detail", DTO_DETAIL],
  ] as const) {
    if (!fs.existsSync(p)) {
      issues.push({ file: label, message: "DTO file missing" });
      continue;
    }
    const text = fs.readFileSync(p, "utf8");
    if (!/\bslug\s*:\s*string\s*\|\s*null\b/.test(text)) {
      issues.push({
        file: path.relative(REPO_ROOT, p),
        message: "DTO must expose slug: string | null as canon public identity",
      });
    }
  }

  if (issues.length === 0) {
    console.log("[guard:slug-primary-catalog] OK — VDP slug-first + DTO slug field.");
    process.exit(0);
  }

  console.error("[guard:slug-primary-catalog] FAIL\n");
  for (const i of issues) {
    console.error(`  ${i.file}: ${i.message}`);
  }

  if (warnOnly) {
    console.error("\n[WARN MODE] SLUG_PRIMARY_GUARD_WARN=1 — exiting 0.");
    process.exit(0);
  }
  process.exit(1);
}

main();

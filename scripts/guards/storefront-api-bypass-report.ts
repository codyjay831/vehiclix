/**
 * Guard (visibility): storefront / public UI still bypasses Website Integration API v1.
 *
 * Canon: storefront must become API client #1; until migration, direct lib/action imports
 * are tracked technical debt — not blocking by default.
 *
 * Scans:
 * - src/app/(marketing)/
 * - src/components/public/
 *
 * Forbidden import sources (for future API consumption):
 * - @/lib/inventory
 * - @/actions/inquiry, @/actions/request, @/actions/payment
 *
 * Run: npx tsx scripts/guards/storefront-api-bypass-report.ts
 *
 * Default: exit 0 (warn-only). Prints each finding.
 * GUARD_STOREFRONT_BYPASS_STRICT=1: exit 1 if any finding (blocking).
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");

const SCAN_DIRS = [
  path.join(REPO_ROOT, "src/app/(marketing)"),
  path.join(REPO_ROOT, "src/components/public"),
];

const FORBIDDEN_SOURCES = [
  "@/lib/inventory",
  "@/actions/inquiry",
  "@/actions/request",
  "@/actions/payment",
];

interface Hit {
  file: string;
  line: number;
  text: string;
}

function walkTsFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTsFiles(full, out);
    else if (ent.isFile() && (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx"))) out.push(full);
  }
}

function main(): void {
  const strict = process.env.GUARD_STOREFRONT_BYPASS_STRICT === "1";
  const files: string[] = [];
  for (const d of SCAN_DIRS) walkTsFiles(d, files);

  const hits: Hit[] = [];
  const sourceRes = FORBIDDEN_SOURCES.map(
    (s) => new RegExp(`from\\s+["']${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`)
  );

  for (const file of files.sort()) {
    const rel = path.relative(REPO_ROOT, file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) return;
      for (const re of sourceRes) {
        if (re.test(line)) {
          hits.push({ file: rel, line: i + 1, text: trimmed });
        }
      }
    });
  }

  console.log("[guard:storefront-api-bypass] Technical debt visibility (API v1 canon)\n");
  if (hits.length === 0) {
    console.log("No forbidden direct imports in (marketing) or components/public.");
    process.exit(0);
  }

  console.log(
    `Found ${hits.length} direct import(s) of internal inventory/leads/reservation actions.\n` +
      "Expected until storefront migration; remove when consuming /api/v1/public/*.\n"
  );
  for (const h of hits) {
    console.log(`  ${h.file}:${h.line}`);
    console.log(`    ${h.text}`);
  }

  if (strict) {
    console.error("\n[STRICT] GUARD_STOREFRONT_BYPASS_STRICT=1 — failing.");
    process.exit(1);
  }
  console.log("\n[WARN-ONLY] Exiting 0. Set GUARD_STOREFRONT_BYPASS_STRICT=1 to fail CI.");
  process.exit(0);
}

main();

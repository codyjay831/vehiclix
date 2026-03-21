/**
 * Guard: no client-provided organizationId in Website Integration API v1 public boundaries.
 *
 * Canon: dealer context is resolved at the request boundary (Host / dealerSlug);
 * organizationId must not be read from query, body, headers, or accepted in public input DTOs.
 *
 * Scope (intentionally narrow):
 * - src/app/api/v1/public/ (all .ts files, recursive)
 * - src/lib/api/dto/public-*.ts
 * - src/lib/api/resolve-dealer.ts
 *
 * Does NOT scan actions, storefront, Prisma, or internal services.
 *
 * Run: npx tsx scripts/guards/no-client-organization-id-in-public-api.ts
 *
 * Modes:
 * - Default: exit 1 if any violation (blocking).
 * - PUBLIC_API_ORG_ID_GUARD_WARN=1: print violations, exit 0 (warn-only for CI rollout).
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");

const SCAN_DIRS = [path.join(REPO_ROOT, "src/app/api/v1/public")];

const SCAN_FILES = [
  path.join(REPO_ROOT, "src/lib/api/resolve-dealer.ts"),
];

const DTO_GLOB_DIR = path.join(REPO_ROOT, "src/lib/api/dto");

/** Violation: reading org id from URL / search params (client-controlled). */
const RE_QUERY_ORG_ID = /\.get\(\s*["'`]organizationId["'`]\s*\)/;

/** Violation: Zod (or similar) accepting organizationId from JSON body. */
const RE_ZOD_ORG_ID = /\borganizationId\s*:\s*z\./;

/** Violation: direct body field access. */
const RE_BODY_DOT_ORG_ID = /\bbody\s*\.\s*organizationId\b/;

/** Violation: parsed POST payload field (common names). */
const RE_PARSED_DATA_ORG_ID = /\bparsed\.data\.organizationId\b/;

/** Violation: form field. */
const RE_FORMDATA_ORG_ID = /formData\.get\(\s*["'`]organizationId["'`]/;

/** Violation: header-based org id (client-supplied). */
const RE_HEADER_ORG_ID =
  /\.get\(\s*["'`]x-organization-id["'`]\s*\)/i;

/** Violation: cookie-based org id (client-supplied). */
const RE_COOKIE_ORG_ID =
  /(?:^|[^a-zA-Z.])(?:cookies\(\)|request\.cookies)\.get\(\s*["'`]organizationId["'`]/;

const RULES: { id: string; re: RegExp; files?: "dto" | "routes" | "resolver" | "all" }[] = [
  { id: "searchParams.get('organizationId')", re: RE_QUERY_ORG_ID, files: "all" },
  { id: "body.organizationId", re: RE_BODY_DOT_ORG_ID, files: "routes" },
  { id: "parsed.data.organizationId", re: RE_PARSED_DATA_ORG_ID, files: "routes" },
  { id: "formData organizationId", re: RE_FORMDATA_ORG_ID, files: "routes" },
  { id: "header x-organization-id", re: RE_HEADER_ORG_ID, files: "all" },
  { id: "cookies/request.cookies organizationId", re: RE_COOKIE_ORG_ID, files: "routes" },
  { id: "zod field organizationId", re: RE_ZOD_ORG_ID, files: "dto" },
];

interface Finding {
  file: string;
  line: number;
  ruleId: string;
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

function listPublicDtoFiles(): string[] {
  if (!fs.existsSync(DTO_GLOB_DIR)) return [];
  return fs
    .readdirSync(DTO_GLOB_DIR)
    .filter((n) => n.startsWith("public-") && n.endsWith(".ts"))
    .map((n) => path.join(DTO_GLOB_DIR, n));
}

function stripLineComment(line: string): string {
  const i = line.indexOf("//");
  if (i === -1) return line;
  return line.slice(0, i);
}

function classifyFile(file: string): "dto" | "routes" | "resolver" {
  if (file.replace(/\\/g, "/").includes("/dto/public-")) return "dto";
  if (file.endsWith("resolve-dealer.ts")) return "resolver";
  return "routes";
}

function ruleApplies(
  rule: (typeof RULES)[0],
  kind: "dto" | "routes" | "resolver"
): boolean {
  if (rule.files === "all") return true;
  if (rule.files === "dto") return kind === "dto";
  if (rule.files === "routes") return kind === "routes";
  return false;
}

function scanFile(file: string, findings: Finding[]): void {
  const kind = classifyFile(file);
  const rel = path.relative(REPO_ROOT, file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const code = stripLineComment(line).trim();
    if (!code || code.startsWith("*") || code.startsWith("/*")) return;

    for (const rule of RULES) {
      if (!ruleApplies(rule, kind)) continue;
      if (rule.re.test(code)) {
        findings.push({
          file: rel,
          line: idx + 1,
          ruleId: rule.id,
          text: line.trim(),
        });
      }
    }
  });
}

function collectFiles(): string[] {
  const files = new Set<string>();
  for (const d of SCAN_DIRS) {
    const acc: string[] = [];
    walkTsFiles(d, acc);
    acc.forEach((f) => files.add(f));
  }
  for (const f of SCAN_FILES) {
    if (fs.existsSync(f)) files.add(f);
  }
  for (const f of listPublicDtoFiles()) files.add(f);
  return [...files].sort();
}

function main(): void {
  const warnOnly = process.env.PUBLIC_API_ORG_ID_GUARD_WARN === "1";
  const files = collectFiles();
  const findings: Finding[] = [];
  for (const f of files) scanFile(f, findings);

  if (findings.length === 0) {
    console.log(
      `[guard:no-client-organizationId] OK — scanned ${files.length} file(s); no violations.`
    );
    process.exit(0);
  }

  console.error(
    `[guard:no-client-organizationId] FAIL — ${findings.length} violation(s) (client org id in public boundary):\n`
  );
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.ruleId}]`);
    console.error(`    ${f.text}`);
  }
  console.error(
    "\nResolve by using resolveDealerFromRequest() only; pass organization.id from that result into core actions."
  );

  if (warnOnly) {
    console.error(
      "\n[WARN MODE] PUBLIC_API_ORG_ID_GUARD_WARN=1 — exiting 0. Remove warn mode for blocking CI."
    );
    process.exit(0);
  }
  process.exit(1);
}

main();

/**
 * Report: Stripe webhook ownership visibility (no refactor; documentation in stdout).
 *
 * Two route handlers exist; both historically use STRIPE_WEBHOOK_SECRET. Stripe allows one URL
 * per endpoint configuration — production must explicitly partition URLs + secrets or unify.
 *
 * Run: npx tsx scripts/guards/stripe-webhook-ownership-report.ts
 *
 * Always exits 0. Not a blocking guard; run in CI for visibility only.
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");

const ROUTES = [
  {
    path: "src/app/api/stripe/webhook/route.ts",
    label: "Deposits / payment_intent (deal flow)",
  },
  {
    path: "src/app/api/webhooks/stripe/route.ts",
    label: "Billing / subscriptions (checkout, subscription, invoice)",
  },
];

function extractEventTypes(ts: string): string[] {
  const out = new Set<string>();
  const caseRe = /case\s+["']([^"']+)["']\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = caseRe.exec(ts)) !== null) out.add(m[1]);
  const ifType = /event\.type\s*===\s*["']([^"']+)["']/g;
  while ((m = ifType.exec(ts)) !== null) out.add(m[1]);
  return [...out].sort();
}

function usesSecret(name: string, ts: string): boolean {
  return new RegExp(`process\\.env\\.${name}`).test(ts) || ts.includes(name);
}

function main(): void {
  console.log("[report:stripe-webhook-ownership] Stripe webhook surface (read-only)\n");

  for (const r of ROUTES) {
    const full = path.join(REPO_ROOT, r.path);
    console.log(`--- ${r.path}`);
    console.log(`    Role: ${r.label}`);
    if (!fs.existsSync(full)) {
      console.log("    [MISSING FILE]\n");
      continue;
    }
    const text = fs.readFileSync(full, "utf8");
    const events = extractEventTypes(text);
    console.log(`    Event types handled: ${events.length ? events.join(", ") : "(see if/switch branches)"}`);
    console.log(`    References STRIPE_WEBHOOK_SECRET: ${usesSecret("STRIPE_WEBHOOK_SECRET", text) ? "yes" : "no"}`);
    console.log("");
  }

  console.log("--- Ambiguity note");
  console.log("    If production registers only ONE Stripe webhook URL, one of these handlers");
  console.log("    will never receive events unless Stripe Dashboard points to both URLs or");
  console.log("    events are consolidated into a single route with delegated switch/cases.");
  console.log("    Resolve by: (A) two endpoints + two webhook secrets, or (B) one route owner.");
  console.log("\n[report:stripe-webhook-ownership] Done (exit 0 — informational only).");
  process.exit(0);
}

main();

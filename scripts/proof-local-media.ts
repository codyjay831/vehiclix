/**
 * E2E smoke: login as demo owner, create draft vehicle + photo, assert local image URL.
 * Run with dev server: npm run dev (then npx tsx scripts/proof-local-media.ts)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.PROOF_BASE_URL || "http://localhost:3000";
const OWNER_EMAIL = process.env.PROOF_OWNER_EMAIL || "owner@evomotors.demo";
const OWNER_PASSWORD = process.env.PROOF_OWNER_PASSWORD || "demoowner123";

async function waitForServer(url: string, maxMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not reachable at ${url} within ${maxMs}ms`);
}

async function main() {
  const tmpDir = join(process.cwd(), "scripts", ".proof-tmp");
  mkdirSync(tmpDir, { recursive: true });
  const jpegPath = join(tmpDir, "proof.jpg");
  const jpeg = await sharp({
    create: { width: 640, height: 480, channels: 3, background: { r: 20, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer();
  writeFileSync(jpegPath, jpeg);

  await waitForServer(`${BASE}/login`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(OWNER_EMAIL);
  await page.locator("#password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/admin/, { timeout: 60_000 });

  await page.goto(`${BASE}/admin/inventory/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="vin"]', { timeout: 60_000 });

  const vin = `1HGBH41JXMN${(Date.now() % 1_000_000).toString().padStart(6, "0")}`; // 17 chars, unique
  await page.locator('input[name="vin"]').fill(vin);
  await page.locator('input[name="year"]').fill("2023");
  await page.locator('input[name="make"]').fill("Tesla");
  await page.locator('input[name="model"]').fill("Model 3");
  await page.locator('input[name="mileage"]').fill("5000");
  await page.locator('input[name="exteriorColor"]').fill("Blue");
  await page.locator('input[name="interiorColor"]').fill("Black");
  await page.locator('input[name="price"]').fill("25990");

  await page.locator('button:has-text("Select drivetrain")').click();
  await page.getByRole("option", { name: /Rear-Wheel Drive/i }).click();

  await page.locator('button:has-text("Select condition")').click();
  await page.getByRole("option", { name: /^Good$/ }).click();

  await page.locator('button:has-text("Select title status")').click();
  await page.getByRole("option", { name: /^Clean$/ }).click();

  await page.locator('input[type="file"][multiple][accept*="image"]').setInputFiles(jpegPath);

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForURL(/\/admin\/inventory$/, { timeout: 120_000 });

  await page.getByRole("tab", { name: "Draft" }).click();

  const thumb = page.locator('img[src*="/uploads/inventory/"]').first();
  await thumb.waitFor({ state: "visible", timeout: 30_000 });
  const src = await thumb.getAttribute("src");
  if (!src || !src.includes("/uploads/inventory/")) {
    throw new Error(`Expected admin thumbnail under /uploads/inventory/, got: ${src}`);
  }

  await browser.close();

  console.log("PROOF_OK");
  console.log("vin", vin);
  console.log("admin_thumb_src", src);
}

main().catch((e) => {
  console.error("PROOF_FAIL", e);
  process.exit(1);
});

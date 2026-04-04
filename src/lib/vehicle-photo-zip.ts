/**
 * Build dealer-friendly ZIPs of vehicle photos using stored keys (gallery preferred, then url).
 * Server-only; reads bytes via storage providers (local/GCS) or fetch for legacy full URLs.
 */

import path from "path";
import { PassThrough, Readable } from "stream";
import archiver from "archiver";
import { resolveStorageKey, getReadStream } from "@/lib/storage";

const ALLOWED_ZIP_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

/**
 * Derives a safe archive extension from the storage key or URL path — never trusts full key shape for entry names.
 * Unknown / odd extensions default to `.jpg` (stored variants are typically JPEG).
 */
function safeZipExtensionFromStorageKey(storageKey: string): string {
  const trimmed = storageKey.trim();
  let probe = trimmed;
  try {
    if (probe.startsWith("http://") || probe.startsWith("https://")) {
      probe = new URL(probe).pathname;
    }
  } catch {
    probe = trimmed.split("?")[0] ?? trimmed;
  }
  const base = path.posix.basename(probe.split("?")[0] ?? probe);
  const ext = path.posix.extname(base).toLowerCase();
  if (ext === ".jpeg" || ext === ".jpg") return ".jpg";
  if (ALLOWED_ZIP_EXTS.has(ext)) return ext;
  return ".jpg";
}

/** Reject path traversal or directory-like ZIP entry names (defense in depth; names are server-generated). */
function isSafeZipEntryFileName(name: string): boolean {
  if (!name || name.length > 200) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  if (name.includes("..")) return false;
  if (name.startsWith(".")) return false;
  return true;
}

/** Soft cap aligned with typical inventory limits; avoids pathological serverless memory use. */
export const MAX_VEHICLE_PHOTOS_ZIP_ENTRIES = 40;

export function pickExportStorageKey(row: {
  galleryUrl: string | null;
  url: string;
}): string | null {
  const g = row.galleryUrl?.trim();
  if (g) return g;
  const u = row.url?.trim();
  return u || null;
}

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "vehicle";
}

/** e.g. 2022-ford-f-150 */
export function buildVehicleZipBaseName(vehicle: {
  year: number;
  make: string;
  model: string;
}): string {
  const base = `${vehicle.year}-${slugPart(vehicle.make)}-${slugPart(vehicle.model)}`;
  return base.replace(/-+/g, "-").replace(/^-|-$/g, "") || "vehicle";
}

/** Deterministic names: `{baseName}-01.jpg`, unique per index; extension from allowlist only. */
export function buildZipEntryNames(baseName: string, storageKeys: string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < storageKeys.length; i++) {
    const ord = String(i + 1).padStart(2, "0");
    const ext = safeZipExtensionFromStorageKey(storageKeys[i]!);
    let name = `${baseName}-${ord}${ext}`;
    let n = 2;
    while (used.has(name)) {
      name = `${baseName}-${ord}-${n}${ext}`;
      n++;
    }
    used.add(name);
    out.push(name);
  }
  return out;
}

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readStorageBytesForZip(key: string): Promise<Buffer> {
  const { isFullUrl } = resolveStorageKey(key);
  if (isFullUrl) {
    const res = await fetch(key);
    if (!res.ok) throw new Error("fetch failed");
    return Buffer.from(await res.arrayBuffer());
  }
  const rs = await getReadStream(key);
  return readStreamToBuffer(rs);
}

export type ZipBuildEntry = { storageKey: string; entryName: string };

/**
 * Builds the ZIP in memory (V1: predictable errors; total size should stay within serverless limits).
 */
export async function buildVehiclePhotosZipBuffer(entries: ZipBuildEntry[]): Promise<Buffer> {
  if (entries.length === 0) {
    throw new Error("NO_IMAGES");
  }

  const archive = archiver("zip", { zlib: { level: 6 } });
  const passthrough = new PassThrough();
  const outputPromise = readStreamToBuffer(passthrough);
  archive.pipe(passthrough);
  archive.on("error", (err) => passthrough.destroy(err));

  let appended = 0;
  for (const e of entries) {
    try {
      if (!isSafeZipEntryFileName(e.entryName)) {
        console.warn(JSON.stringify({ scope: "photos-zip", event: "entry_unsafe_name_skipped" }));
        continue;
      }
      const buf = await readStorageBytesForZip(e.storageKey);
      archive.append(buf, { name: e.entryName });
      appended++;
    } catch {
      // Log only safe identifiers (not storage keys / URLs).
      console.warn(JSON.stringify({ scope: "photos-zip", event: "entry_skipped", entryName: e.entryName }));
    }
  }

  if (appended === 0) {
    archive.destroy();
    passthrough.destroy();
    throw new Error("NO_IMAGES");
  }

  await archive.finalize();
  return outputPromise;
}

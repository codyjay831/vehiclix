/**
 * Storage keys for VehicleMedia rows: collect deletable keys and remove files via @/lib/storage.
 * Full HTTP(S) URLs are skipped (cannot delete external assets).
 */

import { deleteFile, resolveStorageKey } from "@/lib/storage";

export type VehicleMediaStorageRow = {
  url: string;
  thumbUrl?: string | null;
  cardUrl?: string | null;
  galleryUrl?: string | null;
};

/**
 * Returns unique stored paths/keys suitable for deleteFile(), deduped by normalized bare key.
 */
export function collectDeletableVehicleMediaKeys(row: VehicleMediaStorageRow): string[] {
  const candidates = [row.url, row.thumbUrl, row.cardUrl, row.galleryUrl];
  const seenNormalized = new Set<string>();
  const out: string[] = [];

  for (const v of candidates) {
    if (v == null) continue;
    const t = String(v).trim();
    if (!t) continue;
    const { key, isFullUrl } = resolveStorageKey(t);
    if (isFullUrl || !key) continue;
    if (seenNormalized.has(key)) continue;
    seenNormalized.add(key);
    out.push(t);
  }

  return out;
}

/** Best-effort delete of all deletable files for one media row. */
export async function deleteStoredVehicleMediaFiles(row: VehicleMediaStorageRow): Promise<void> {
  const keys = collectDeletableVehicleMediaKeys(row);
  await Promise.all(keys.map((k) => deleteFile(k).catch(() => undefined)));
}

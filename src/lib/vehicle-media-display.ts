/**
 * Resolved URL helpers for VehicleMedia (after enrichVehicleMedia / getPublicUrl).
 * Prefer variants when present; fall back to legacy `url` only.
 */

type MediaRow = {
  url: string;
  thumbUrl?: string | null;
  cardUrl?: string | null;
  galleryUrl?: string | null;
};

/** Inventory cards, API card hero — card size first. */
export function vehicleMediaCardUrl(m: MediaRow): string {
  return m.cardUrl ?? m.galleryUrl ?? m.url;
}

/** Admin list / small previews — smallest reasonable asset. */
export function vehicleMediaAdminThumbUrl(m: MediaRow): string {
  return m.thumbUrl ?? m.cardUrl ?? m.url;
}

/** VDP hero and lightbox — full gallery width. */
export function vehicleMediaGalleryUrl(m: MediaRow): string {
  return m.galleryUrl ?? m.url;
}

/** Thumbnail strip in gallery — thumb size. */
export function vehicleMediaStripThumbUrl(m: MediaRow): string {
  return m.thumbUrl ?? m.url;
}

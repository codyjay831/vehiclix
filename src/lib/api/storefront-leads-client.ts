/**
 * Browser fetch helper for POST /api/v1/public/leads (storefront Phase 3).
 * Same-origin; pass dealerSlug query on platform host — never send organizationId in the body.
 */

import type { SerializedVehicle } from "@/types";

/** API accepts vehicleId (UUID) or vehicleSlug; prefer slug when present. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function inquiryVehicleRefForPublicLead(
  vehicle: SerializedVehicle & { slug?: string | null }
): { vehicleSlug: string } | { vehicleId: string } {
  const slug = vehicle.slug?.trim();
  if (slug) return { vehicleSlug: slug };
  if (UUID_RE.test(vehicle.id)) return { vehicleId: vehicle.id };
  return { vehicleSlug: vehicle.id };
}

export type PostStorefrontPublicLeadResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

type LeadErrorJson = {
  success?: boolean;
  message?: string;
  error?: string;
};

/**
 * POST public lead (inquiry | vehicle_request). Dealer resolved server-side from Host + optional dealerSlug.
 */
export async function postStorefrontPublicLead(
  body: object,
  dealerSlug?: string | null
): Promise<PostStorefrontPublicLeadResult> {
  const q = dealerSlug?.trim()
    ? `?dealerSlug=${encodeURIComponent(dealerSlug.trim())}`
    : "";
  const res = await fetch(`/api/v1/public/leads${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: LeadErrorJson = {};
  try {
    data = (await res.json()) as LeadErrorJson;
  } catch {
    // non-JSON body
  }

  if (res.status === 201 && data.success === true) {
    return { ok: true };
  }

  let message = "Something went wrong. Please try again.";
  if (typeof data.message === "string" && data.message.length > 0) {
    message = data.message;
  } else if (res.status === 429) {
    message = "Too many submissions. Please wait a moment and try again.";
  }

  return { ok: false, status: res.status, message };
}

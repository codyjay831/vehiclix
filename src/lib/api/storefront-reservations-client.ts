/**
 * Browser fetch helper for POST /api/v1/public/reservations (storefront Phase 4).
 * Same-origin; pass dealerSlug on platform host — never send organizationId in the body.
 */

import type { SerializedVehicle } from "@/types";
import { inquiryVehicleRefForPublicLead } from "@/lib/api/storefront-leads-client";

export type PostStorefrontPublicReservationResult =
  | { ok: true; clientSecret: string; dealId: string }
  | { ok: false; status: number; message: string; vehicleUnavailable: boolean };

type ReservationJson = {
  success?: boolean;
  message?: string;
  error?: string;
  clientSecret?: string;
  dealId?: string;
};

/** Prefer slug when present; else UUID as vehicleId; else slug segment as vehicleSlug. */
export function reservationVehicleRefForPublicLead(vehicle: {
  id: string;
  slug?: string | null;
}) {
  return inquiryVehicleRefForPublicLead(vehicle as SerializedVehicle & { slug?: string | null });
}

export async function postStorefrontPublicReservation(
  body: object,
  dealerSlug?: string | null
): Promise<PostStorefrontPublicReservationResult> {
  const q = dealerSlug?.trim()
    ? `?dealerSlug=${encodeURIComponent(dealerSlug.trim())}`
    : "";
  const res = await fetch(`/api/v1/public/reservations${q}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data: ReservationJson = {};
  try {
    data = (await res.json()) as ReservationJson;
  } catch {
    // non-JSON
  }

  if (
    res.status === 201 &&
    data.success === true &&
    typeof data.clientSecret === "string" &&
    typeof data.dealId === "string"
  ) {
    return { ok: true, clientSecret: data.clientSecret, dealId: data.dealId };
  }

  let message = "Something went wrong. Please try again.";
  if (typeof data.message === "string" && data.message.length > 0) {
    message = data.message;
  } else if (res.status === 429) {
    message = "Too many requests. Please wait a moment and try again.";
  }

  return {
    ok: false,
    status: res.status,
    message,
    vehicleUnavailable: res.status === 409,
  };
}

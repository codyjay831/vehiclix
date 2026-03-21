/**
 * POST /api/v1/public/reservations
 *
 * Public reservation (deposit) initiation for Website Integration API v1.
 * Resolves dealer at boundary; ignores client organizationId; vehicle-scoped validation.
 * Thin wrapper over existing initiateVehicleReservationAction; payment authority stays in core.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveDealerFromRequest } from "@/lib/api/resolve-dealer";
import { getPublicVehicleDetailBySlugOrId } from "@/lib/inventory";
import { initiateVehicleReservationAction } from "@/actions/payment";
import { publicReservationInputSchema } from "@/lib/api/dto/public-reservation-input";
import {
  checkRateLimit,
  getClientIpForRateLimit,
  rateLimitExceededResponse,
  V1_PUBLIC_RESERVATIONS_LIMIT,
  V1_PUBLIC_RESERVATIONS_WINDOW_MS,
} from "@/lib/api/rate-limit";

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpForRateLimit(request);
    const rl = checkRateLimit(
      `v1:public:reservations:${ip}`,
      V1_PUBLIC_RESERVATIONS_LIMIT,
      V1_PUBLIC_RESERVATIONS_WINDOW_MS
    );
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterMs);
    }

    const result = await resolveDealerFromRequest(request);

    if (!result.ok) {
      if (result.code === "INVALID_SLUG") {
        return jsonResponse(
          { error: "Bad request", message: result.message },
          400
        );
      }
      return jsonResponse(
        { error: "Not found", message: "Dealer not found" },
        404
      );
    }

    const { organization } = result;
    if (organization.status === "SUSPENDED") {
      return jsonResponse(
        { error: "Not found", message: "Dealer not found" },
        404
      );
    }

    // Never read organizationId from body; dealer is resolved at boundary only.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Bad request", message: "Invalid JSON body" },
        400
      );
    }

    const parsed = publicReservationInputSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first).flat().find(Boolean) ?? "Validation failed";
      return jsonResponse(
        { error: "Bad request", message: String(message) },
        400
      );
    }

    const data = parsed.data;
    const vehicleRef = data.vehicleSlug ?? data.vehicleId;
    if (!vehicleRef) {
      return jsonResponse(
        { error: "Bad request", message: "Vehicle reference (vehicleSlug or vehicleId) is required" },
        400
      );
    }

    const vehicle = await getPublicVehicleDetailBySlugOrId(organization.id, vehicleRef);
    if (!vehicle) {
      return jsonResponse(
        { error: "Not found", message: "Vehicle not found or not available" },
        404
      );
    }

    const coreResult = await initiateVehicleReservationAction({
      vehicleId: vehicle.id,
      organizationId: organization.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      message: data.message,
    });

    if (coreResult.success && coreResult.clientSecret != null && coreResult.dealId != null) {
      return jsonResponse(
        {
          success: true,
          clientSecret: coreResult.clientSecret,
          dealId: coreResult.dealId,
        },
        201
      );
    }

    if (coreResult.error === "VEHICLE_UNAVAILABLE") {
      return jsonResponse(
        { error: "Conflict", message: "Vehicle is no longer available for reservation" },
        409
      );
    }

    return jsonResponse(
      { error: "Internal server error", message: "An unexpected error occurred" },
      500
    );
  } catch (err) {
    console.error("[v1/public/reservations]", err);
    return jsonResponse(
      { error: "Internal server error", message: "An unexpected error occurred" },
      500
    );
  }
}

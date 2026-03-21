/**
 * GET /api/v1/public/catalog/[vehicleId]
 *
 * Public vehicle detail (VDP) for Website Integration API v1.
 * Resolves dealer from request; lookup by slug (primary) or id (fallback), dealer-scoped.
 * Canon: slug primary, vehicleId fallback; no vehicle without dealer scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveDealerFromRequest } from "@/lib/api/resolve-dealer";
import { getPublicVehicleDetailBySlugOrId } from "@/lib/inventory";
import { toPublicVehicleDetailDto } from "@/lib/api/dto/public-vehicle-detail";

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, { status });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vehicleId: string }> }
) {
  try {
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

    const { vehicleId: slugOrId } = await context.params;
    if (!slugOrId) {
      return jsonResponse(
        { error: "Bad request", message: "Vehicle identifier is required" },
        400
      );
    }

    const vehicle = await getPublicVehicleDetailBySlugOrId(organization.id, slugOrId);
    if (!vehicle) {
      return jsonResponse(
        { error: "Not found", message: "Vehicle not found or not available" },
        404
      );
    }

    const dto = toPublicVehicleDetailDto(vehicle);
    return NextResponse.json(dto, { status: 200 });
  } catch (err) {
    console.error("[v1/public/catalog/[slugOrId]]", err);
    return jsonResponse(
      { error: "Internal server error", message: "An unexpected error occurred" },
      500
    );
  }
}

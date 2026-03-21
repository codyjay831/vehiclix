/**
 * GET /api/v1/public/catalog
 *
 * Public inventory list for Website Integration API v1.
 * Resolves dealer from request; returns LISTED-only vehicles with full media URLs.
 * Canon: dealer-scoped, public-safe DTOs, no core logic rewrite.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveDealerFromRequest } from "@/lib/api/resolve-dealer";
import { getPublicInventory } from "@/lib/inventory";
import { toPublicVehicleCardDto } from "@/lib/api/dto/public-vehicle-card";

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const make = url.searchParams.get("make") ?? undefined;
    const maxPriceParam = url.searchParams.get("maxPrice");
    const minYearParam = url.searchParams.get("minYear");
    const sort = url.searchParams.get("sort") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;

    const filters = {
      make: make && make !== "all" ? make : undefined,
      maxPrice: maxPriceParam != null && maxPriceParam !== "" ? parseFloat(maxPriceParam) : undefined,
      minYear: minYearParam != null && minYearParam !== "" ? parseInt(minYearParam, 10) : undefined,
      sort,
      search,
    };

    if (filters.maxPrice !== undefined && Number.isNaN(filters.maxPrice)) {
      return jsonResponse(
        { error: "Bad request", message: "Invalid maxPrice" },
        400
      );
    }
    if (filters.minYear !== undefined && Number.isNaN(filters.minYear)) {
      return jsonResponse(
        { error: "Bad request", message: "Invalid minYear" },
        400
      );
    }

    const vehicles = await getPublicInventory(organization.id, filters);
    const items = vehicles.map(toPublicVehicleCardDto);

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[v1/public/catalog]", err);
    return jsonResponse(
      { error: "Internal server error", message: "An unexpected error occurred" },
      500
    );
  }
}

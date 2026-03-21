/**
 * GET /api/v1/public/dealers
 *
 * Public dealer read boundary for Website Integration API v1.
 * Resolves dealer from request (domain-first, dealerSlug fallback); returns public-safe DTO.
 * Canon: dealers read-only; no client organizationId; permission-trimmed response.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveDealerFromRequest } from "@/lib/api/resolve-dealer";
import { toPublicDealerDto } from "@/lib/api/dto/public-dealer";

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

    // Do not expose suspended dealers (same as storefront)
    if (organization.status === "SUSPENDED") {
      return jsonResponse(
        { error: "Not found", message: "Dealer not found" },
        404
      );
    }

    const dto = toPublicDealerDto(organization);
    return NextResponse.json(dto, { status: 200 });
  } catch (err) {
    console.error("[v1/public/dealers]", err);
    return jsonResponse(
      { error: "Internal server error", message: "An unexpected error occurred" },
      500
    );
  }
}

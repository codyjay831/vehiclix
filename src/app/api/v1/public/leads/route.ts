/**
 * POST /api/v1/public/leads
 *
 * Public lead capture for Website Integration API v1.
 * Resolves dealer at boundary; ignores client organizationId; vehicle-scoped validation.
 * Thin wrapper over existing inquiry and vehicle-request pipelines.
 */

import { NextRequest, NextResponse } from "next/server";
import { ContactMethod } from "@prisma/client";
import { resolveDealerFromRequest } from "@/lib/api/resolve-dealer";
import { getPublicVehicleDetailBySlugOrId } from "@/lib/inventory";
import { submitInquiryAction } from "@/actions/inquiry";
import { submitVehicleRequestAction } from "@/actions/request";
import {
  publicLeadInputSchema,
  type InquiryLeadInput,
  type VehicleRequestLeadInput,
} from "@/lib/api/dto/public-lead-input";
import {
  checkRateLimit,
  getClientIpForRateLimit,
  rateLimitExceededResponse,
  V1_PUBLIC_LEADS_LIMIT,
  V1_PUBLIC_LEADS_WINDOW_MS,
} from "@/lib/api/rate-limit";

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIpForRateLimit(request);
    const rl = checkRateLimit(
      `v1:public:leads:${ip}`,
      V1_PUBLIC_LEADS_LIMIT,
      V1_PUBLIC_LEADS_WINDOW_MS
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

    const parsed = publicLeadInputSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first).flat().find(Boolean) ?? "Validation failed";
      return jsonResponse(
        { error: "Bad request", message: String(message) },
        400
      );
    }

    const data = parsed.data;

    if (data.type === "inquiry") {
      const inquiryData = data as InquiryLeadInput;
      const vehicleRef = inquiryData.vehicleSlug ?? inquiryData.vehicleId;
      if (!vehicleRef) {
        return jsonResponse(
          { error: "Bad request", message: "Vehicle reference (vehicleSlug or vehicleId) is required for inquiry" },
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

      await submitInquiryAction({
        vehicleId: vehicle.id,
        firstName: inquiryData.firstName,
        lastName: inquiryData.lastName,
        email: inquiryData.email,
        phone: inquiryData.phone,
        preferredContact: inquiryData.preferredContact as ContactMethod,
        message: inquiryData.message,
        tradeInInterest: inquiryData.tradeInInterest,
        financingInterest: inquiryData.financingInterest,
        honeypot: inquiryData.honeypot,
      });

      return jsonResponse({ success: true }, 201);
    }

    if (data.type === "vehicle_request") {
      const reqData = data as VehicleRequestLeadInput;
      await submitVehicleRequestAction(
        {
          organizationId: organization.id,
          make: reqData.make,
          model: reqData.model,
          yearMin: reqData.yearMin,
          yearMax: reqData.yearMax,
          trim: reqData.trim,
          mileageMax: reqData.mileageMax,
          colorPrefs: reqData.colorPrefs,
          features: reqData.features,
          budgetMax: reqData.budgetMax,
          timeline: reqData.timeline,
          financingInterest: reqData.financingInterest,
          tradeInInterest: reqData.tradeInInterest,
          notes: reqData.notes,
          firstName: reqData.firstName,
          lastName: reqData.lastName,
          email: reqData.email,
          phone: reqData.phone,
        },
        { skipRedirect: true }
      );

      return jsonResponse({ success: true }, 201);
    }

    return jsonResponse(
      { error: "Bad request", message: "Invalid lead type" },
      400
    );
  } catch (err) {
    console.error("[v1/public/leads]", err);
    return jsonResponse(
      { error: "Internal server error", message: "An unexpected error occurred" },
      500
    );
  }
}

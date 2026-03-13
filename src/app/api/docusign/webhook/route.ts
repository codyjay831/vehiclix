import { NextRequest, NextResponse } from "next/server";
import { verifyDocuSignSignature } from "@/lib/docusign";
import { db } from "@/lib/db";
import { DealStatus, EnvelopeStatus } from "@prisma/client";

/**
 * POST /api/docusign/webhook
 * Handles DocuSign Connect JSON webhook notifications.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-docusign-signature-1");

  if (!signature || !verifyDocuSignSignature(rawBody, signature)) {
    console.error("Invalid DocuSign signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("Failed to parse DocuSign webhook payload:", err);
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const event = payload.event;
  const envelopeId = payload.data?.envelopeId;

  if (event === "envelope-completed" && envelopeId) {
    // Perform atomic updates in a transaction
    try {
      const envelope = await db.docuSignEnvelope.findUnique({
        where: { envelopeId },
        select: { 
          dealId: true,
          deal: { select: { organizationId: true } }
        },
      });

      if (!envelope || !(envelope.deal as any).organizationId) {
        console.warn(`DocuSign webhook: Envelope ${envelopeId} or its deal/organization not found.`);
        return new NextResponse("Envelope or deal not found", { status: 404 });
      }

      const organizationId = (envelope.deal as any).organizationId;

      await db.$transaction([
        // 1. Update envelope status
        db.docuSignEnvelope.update({
          where: { envelopeId },
          data: { 
            envelopeStatus: EnvelopeStatus.COMPLETED,
            completedAt: new Date(),
          },
        }),
        // 2. Update deal status
        db.deal.update({
          where: { id: envelope.dealId },
          data: { dealStatus: DealStatus.CONTRACTS_SIGNED },
        }),
        // 3. Log activity event
        db.activityEvent.create({
          data: {
            eventType: "deal.contracts_signed",
            entityType: "Deal",
            entityId: envelope.dealId,
            organizationId,
            metadata: { envelopeId },
          },
        }),
      ]);

      console.log(`DocuSign webhook: Deal ${envelope.dealId} marked as CONTRACTS_SIGNED.`);
    } catch (err) {
      console.error("Failed to process DocuSign completion transaction:", err);
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  }

  return new NextResponse("OK", { status: 200 });
}

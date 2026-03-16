"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { DealStatus, VehicleStatus, Role, DocumentStatus, EnvelopeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createMockEnvelope } from "@/lib/docusign";
import { requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";

/**
 * Valid transitions for deal status.
 */
const VALID_TRANSITIONS: Record<DealStatus, DealStatus | null> = {
  [DealStatus.DEPOSIT_RECEIVED]: DealStatus.DOCUMENTS_PENDING,
  [DealStatus.DOCUMENTS_PENDING]: DealStatus.CONTRACTS_SENT,
  [DealStatus.CONTRACTS_SENT]: DealStatus.CONTRACTS_SIGNED,
  [DealStatus.CONTRACTS_SIGNED]: DealStatus.FINANCING_PENDING,
  [DealStatus.FINANCING_PENDING]: DealStatus.READY_FOR_DELIVERY,
  [DealStatus.READY_FOR_DELIVERY]: DealStatus.COMPLETED,
  [DealStatus.COMPLETED]: null,
  [DealStatus.CANCELLED]: null,
  [DealStatus.LEAD]: DealStatus.DEPOSIT_PENDING,
  [DealStatus.DEPOSIT_PENDING]: DealStatus.DEPOSIT_RECEIVED,
};

const CANCELLABLE_STATES: DealStatus[] = [
  DealStatus.DEPOSIT_RECEIVED,
  DealStatus.DOCUMENTS_PENDING,
  DealStatus.CONTRACTS_SENT,
  DealStatus.CONTRACTS_SIGNED,
  DealStatus.FINANCING_PENDING,
  DealStatus.READY_FOR_DELIVERY,
];

export async function updateDealStatusAction(dealId: string, nextStatus: DealStatus) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId: user.organizationId },
    select: { dealStatus: true, vehicleId: true, organizationId: true },
  });

  if (!deal) {
    throw new Error("Deal not found or access denied");
  }

  if (VALID_TRANSITIONS[deal.dealStatus] !== nextStatus) {
    throw new Error(`Invalid status transition from ${deal.dealStatus} to ${nextStatus}`);
  }

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: { dealStatus: nextStatus },
    });

    if (nextStatus === DealStatus.COMPLETED) {
      await tx.vehicle.update({
        where: { id: deal.vehicleId },
        data: { vehicleStatus: VehicleStatus.SOLD },
      });
    }

    await tx.activityEvent.create({
      data: {
        eventType: `deal.${nextStatus.toLowerCase()}`,
        entityType: "Deal",
        entityId: dealId,
        organizationId: user.organizationId,
        actorId: user.id,
        actorRole: user.role,
        metadata: { previousStatus: deal.dealStatus },
      },
    });
  });

  revalidatePath("/admin/deals");
  revalidatePath(`/admin/deals/${dealId}`);
  return { success: true };
}

export async function cancelDealAction(dealId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId: user.organizationId },
    select: { dealStatus: true, vehicleId: true, organizationId: true },
  });

  if (!deal) {
    throw new Error("Deal not found or access denied");
  }

  if (!CANCELLABLE_STATES.includes(deal.dealStatus)) {
    throw new Error(`Cannot cancel deal from state: ${deal.dealStatus}`);
  }

  await db.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: { dealStatus: DealStatus.CANCELLED },
    });

    await tx.vehicle.update({
      where: { id: deal.vehicleId },
      data: { vehicleStatus: VehicleStatus.LISTED },
    });

    await tx.activityEvent.create({
      data: {
        eventType: "deal.cancelled",
        entityType: "Deal",
        entityId: dealId,
        organizationId: user.organizationId,
        actorId: user.id,
        actorRole: user.role,
        metadata: { previousStatus: deal.dealStatus },
      },
    });
  });

  revalidatePath("/admin/deals");
  revalidatePath(`/admin/deals/${dealId}`);
  return { success: true };
}

export async function initiateDocuSignAction(dealId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId: user.organizationId },
    include: {
      documents: true,
      envelopes: {
        where: {
          envelopeStatus: {
            in: [EnvelopeStatus.SENT, EnvelopeStatus.DELIVERED],
          },
        },
      },
    },
  });

  if (!deal) {
    throw new Error("Deal not found or access denied");
  }

  if (deal.dealStatus !== DealStatus.DOCUMENTS_PENDING) {
    throw new Error(`Invalid deal status: ${deal.dealStatus}. Must be DOCUMENTS_PENDING.`);
  }

  if (deal.documents.length === 0) {
    throw new Error("No documents found for this deal.");
  }
  const allVerified = deal.documents.every(doc => doc.documentStatus === DocumentStatus.VERIFIED);
  if (!allVerified) {
    throw new Error("All required documents must be VERIFIED before sending contracts.");
  }

  if (deal.envelopes.length > 0) {
    throw new Error("There is already an active DocuSign envelope for this deal.");
  }

  const { envelopeId } = await createMockEnvelope();

  await db.$transaction(async (tx) => {
    await tx.docuSignEnvelope.create({
      data: {
        dealId,
        envelopeId,
        envelopeStatus: EnvelopeStatus.SENT,
      },
    });

    await tx.deal.update({
      where: { id: dealId },
      data: { dealStatus: DealStatus.CONTRACTS_SENT },
    });

    await tx.activityEvent.create({
      data: {
        eventType: "deal.contracts_sent",
        entityType: "Deal",
        entityId: dealId,
        organizationId: user.organizationId,
        actorId: user.id,
        actorRole: user.role,
        metadata: { envelopeId },
      },
    });
  });

  revalidatePath("/admin/deals");
  revalidatePath(`/admin/deals/${dealId}`);
  return { success: true };
}

import { db } from "./db";
import { DealStatus, DocumentStatus } from "@prisma/client";

/**
 * Ensures that required DealDocument placeholder records exist for an active deal.
 */
export async function ensureDocumentPlaceholders(dealId: string) {
  const requiredTypes = ["DRIVERS_LICENSE", "PROOF_OF_INSURANCE"];

  // Fetch existing documents for this deal
  const existingDocs = await db.dealDocument.findMany({
    where: { dealId },
    select: { documentType: true },
  });

  const existingTypes = existingDocs.map(d => d.documentType);

  // Identify missing types
  const missingTypes = requiredTypes.filter(type => !existingTypes.includes(type));

  // Create placeholders for missing types
  if (missingTypes.length > 0) {
    await db.dealDocument.createMany({
      data: missingTypes.map(type => ({
        dealId,
        documentType: type,
        documentStatus: DocumentStatus.PENDING,
        fileUrl: null,
      })),
    });
  }

  // Return all documents for this deal
  return db.dealDocument.findMany({
    where: { dealId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Fetches required documents for a given deal.
 */
export async function getDealDocuments(dealId: string) {
  return db.dealDocument.findMany({
    where: { dealId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Checks if any required document is still pending for a deal.
 */
export async function hasPendingDocuments(dealId: string): Promise<boolean> {
  const pendingCount = await db.dealDocument.count({
    where: {
      dealId,
      documentStatus: DocumentStatus.PENDING,
    },
  });

  return pendingCount > 0;
}

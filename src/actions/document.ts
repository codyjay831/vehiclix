"use server";

import { db } from "@/lib/db";
import { DocumentStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { saveFile } from "@/lib/storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

/**
 * Handles document upload from the customer portal.
 */
export async function uploadDocumentAction(dealId: string, documentId: string, formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.CUSTOMER) {
    throw new Error("Unauthorized: Customer access required");
  }

  // Verify that the deal belongs to the current user
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: { userId: true },
  });

  if (!deal || deal.userId !== user.id) {
    throw new Error("Deal not found or unauthorized");
  }

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed.");
  }

  // Save file to private storage
  const filename = await saveFile(file);

  // Update DealDocument record in a transaction
  await db.$transaction([
    db.dealDocument.update({
      where: { id: documentId },
      data: {
        documentStatus: DocumentStatus.UPLOADED,
        fileUrl: filename, // Save relative path/filename
      },
    }),
    db.activityEvent.create({
      data: {
        eventType: "document.uploaded",
        entityType: "Deal",
        entityId: dealId,
        actorRole: Role.CUSTOMER,
        metadata: { documentId },
      },
    }),
  ]);

  revalidatePath("/portal/documents");
  revalidatePath("/portal");
  return { success: true };
}

/**
 * Marks a document as verified by the owner.
 */
export async function verifyDocumentAction(documentId: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
  }

  const document = await db.dealDocument.findUnique({
    where: { id: documentId },
    select: { documentStatus: true, dealId: true },
  });

  if (!document) throw new Error("Document not found");
  if (document.documentStatus !== DocumentStatus.UPLOADED) {
    throw new Error(`Invalid transition: Cannot verify document in ${document.documentStatus} status`);
  }

  await db.$transaction([
    db.dealDocument.update({
      where: { id: documentId },
      data: { documentStatus: DocumentStatus.VERIFIED },
    }),
    db.activityEvent.create({
      data: {
        eventType: "document.verified",
        entityType: "Deal",
        entityId: document.dealId,
        actorRole: Role.OWNER,
        metadata: { documentId },
      },
    }),
  ]);

  revalidatePath(`/admin/deals/${document.dealId}`);
  return { success: true };
}

/**
 * Marks a document as rejected by the owner.
 */
export async function rejectDocumentAction(documentId: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
  }

  const document = await db.dealDocument.findUnique({
    where: { id: documentId },
    select: { documentStatus: true, dealId: true },
  });

  if (!document) throw new Error("Document not found");
  if (document.documentStatus !== DocumentStatus.UPLOADED) {
    throw new Error(`Invalid transition: Cannot reject document in ${document.documentStatus} status`);
  }

  await db.$transaction([
    db.dealDocument.update({
      where: { id: documentId },
      data: { documentStatus: DocumentStatus.REJECTED },
    }),
    db.activityEvent.create({
      data: {
        eventType: "document.rejected",
        entityType: "Deal",
        entityId: document.dealId,
        actorRole: Role.OWNER,
        metadata: { documentId },
      },
    }),
  ]);

  revalidatePath(`/admin/deals/${document.dealId}`);
  return { success: true };
}

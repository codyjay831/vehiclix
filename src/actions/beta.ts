"use server";

import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { Role, BetaAccessStatus, InviteStatus } from "@prisma/client";
import { createOrganizationAction } from "./organization";
import { revalidatePath } from "next/cache";
import { crypto } from "next/dist/compiled/@edge-runtime/primitives"; // Or standard crypto if preferred

/**
 * Public action to submit a beta access request.
 */
export async function submitBetaRequestAction(formData: FormData) {
  const email = formData.get("email") as string;
  const dealershipName = formData.get("dealershipName") as string;
  const contactName = formData.get("contactName") as string;
  const phone = formData.get("phone") as string;

  if (!email || !dealershipName || !contactName) {
    return { error: "Required fields are missing." };
  }

  // Check for active pending request for this email
  const existing = await db.betaAccessRequest.findFirst({
    where: { 
      email: email.toLowerCase(),
      status: BetaAccessStatus.PENDING 
    }
  });

  if (existing) {
    return { error: "A request for this email is already pending review." };
  }

  await db.betaAccessRequest.create({
    data: {
      email: email.toLowerCase(),
      dealershipName,
      contactName,
      phone,
      status: BetaAccessStatus.PENDING
    }
  });

  return { success: true };
}

/**
 * Super Admin action to approve a beta request.
 * provisions organization and creates an invite token.
 */
export async function approveBetaRequestAction(requestId: string, slugOverride?: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required.");
  }

  const request = await db.betaAccessRequest.findUnique({
    where: { id: requestId }
  });

  if (!request || request.status !== BetaAccessStatus.PENDING) {
    throw new Error("Invalid request or already processed.");
  }

  // Transactional provision
  const result = await db.$transaction(async (tx) => {
    // 1. Provision organization (Note: we're using the base logic but wrapping it)
    // We can't directly use createOrganizationAction because it revalidates/audits outside the TX.
    // Instead, we implement the core logic here.
    
    const slug = slugOverride || request.dealershipName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check slug uniqueness within transaction
    const existingOrg = await tx.organization.findUnique({ where: { slug } });
    if (existingOrg) throw new Error(`Slug "${slug}" is already in use.`);

    const org = await tx.organization.create({
      data: {
        name: request.dealershipName,
        slug: slug,
      }
    });

    // 2. Create Invite Token
    const inviteToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const invite = await tx.ownerInvite.create({
      data: {
        token: inviteToken,
        email: request.email,
        organizationId: org.id,
        expiresAt,
        status: InviteStatus.PENDING
      }
    });

    // 3. Update Request status
    await tx.betaAccessRequest.update({
      where: { id: requestId },
      data: {
        status: BetaAccessStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedByUserId: user.id,
        organizationId: org.id
      }
    });

    return { org, inviteToken };
  });

  revalidatePath("/super-admin/requests");
  return { success: true, inviteToken: result.inviteToken };
}

/**
 * Super Admin action to reject a beta request.
 */
export async function rejectBetaRequestAction(requestId: string, reason: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required.");
  }

  await db.betaAccessRequest.update({
    where: { id: requestId },
    data: {
      status: BetaAccessStatus.REJECTED,
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedByUserId: user.id
    }
  });

  revalidatePath("/super-admin/requests");
  return { success: true };
}

/**
 * Super Admin fetcher for requests.
 */
export async function getBetaRequestsAction() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required.");
  }

  return db.betaAccessRequest.findMany({
    orderBy: { createdAt: "desc" }
  });
}

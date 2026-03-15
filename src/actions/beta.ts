"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
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

import { hashToken } from "@/lib/crypto";
import { sendInviteEmail } from "@/lib/mail";

/**
 * Super Admin action to approve a beta request.
 * provisions organization and creates an invite token.
 */
export async function approveBetaRequestAction(requestId: string, slugOverride?: string) {
  await requireWriteAccess();
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
    // 1. Provision organization
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
    const rawToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await tx.ownerInvite.create({
      data: {
        tokenHash,
        email: request.email,
        organizationId: org.id,
        expiresAt,
        status: InviteStatus.PENDING,
        lastSentAt: new Date(),
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

    return { org, rawToken };
  });

  // 4. Send Email (Outside transaction for reliability/latency)
  const baseUrl = process.env.APP_URL || "https://vehiclix.app";
  const inviteUrl = `${baseUrl}/setup-owner/${result.rawToken}`;
  
  const mailResult = await sendInviteEmail({
    email: request.email,
    dealershipName: request.dealershipName,
    inviteUrl,
  });

  revalidatePath("/super-admin/requests");
  return { 
    success: true, 
    inviteToken: result.rawToken,
    emailSent: mailResult.success,
    emailError: mailResult.error
  };
}

/**
 * Super Admin action to resend an existing invite.
 */
export async function resendInviteAction(organizationId: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized.");
  }

  const invite = await db.ownerInvite.findFirst({
    where: { organizationId, status: InviteStatus.PENDING },
    include: { organization: true }
  });

  if (!invite || invite.expiresAt < new Date()) {
    throw new Error("No valid pending invite found. Please regenerate.");
  }

  // Note: Since we only store tokenHash, we can't "resend" the exact same raw token 
  // unless we pass it around or store it temporarily. 
  // SECURITY REQUIREMENT: "Harden invite tokens at rest".
  // DECISION: Resending a hashed token is impossible. "Resend" must regenerate a NEW token.
  // I'll update the logic to regenerate on resend, or rename this to "Regenerate & Send".
  // Actually, the prompt says: "resend existing still-valid invite" OR "regenerate".
  // If I hash at rest, I MUST regenerate to resend.
  
  return regenerateInviteAction(organizationId);
}

/**
 * Super Admin action to regenerate an invite.
 */
export async function regenerateInviteAction(organizationId: string) {
  await requireWriteAccess();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized.");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId }
  });

  if (!org) throw new Error("Organization not found.");

  // 1. Revoke old pending invites
  await db.ownerInvite.updateMany({
    where: { organizationId, status: InviteStatus.PENDING },
    data: { status: InviteStatus.REVOKED }
  });

  // 2. Create new token
  const rawToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const invite = await db.ownerInvite.create({
    data: {
      tokenHash,
      email: (await db.user.findFirst({ where: { organizationId, role: Role.OWNER } }))?.email || (await db.betaAccessRequest.findFirst({ where: { organizationId } }))?.email || "",
      organizationId,
      expiresAt,
      status: InviteStatus.PENDING,
      lastSentAt: new Date(),
    }
  });

  // 3. Send Email
  const baseUrl = process.env.APP_URL || "https://vehiclix.app";
  const inviteUrl = `${baseUrl}/setup-owner/${rawToken}`;
  
  const mailResult = await sendInviteEmail({
    email: invite.email,
    dealershipName: org.name,
    inviteUrl,
  });

  revalidatePath("/super-admin/requests");
  return { 
    success: true, 
    inviteToken: rawToken,
    emailSent: mailResult.success,
    emailError: mailResult.error
  };
}

/**
 * Super Admin action to reject a beta request.
 */
export async function rejectBetaRequestAction(requestId: string, reason: string) {
  await requireWriteAccess();
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

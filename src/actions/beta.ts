"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { Role, BetaAccessStatus, InviteStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { normalizeSlug, validateOrganizationSlug } from "@/lib/organization";
import { hashToken } from "@/lib/crypto";
import { sendInviteEmail } from "@/lib/mail";

/**
 * Public action: submit a beta access request from the marketing request-access page.
 */
export async function submitBetaRequestAction(
  formData: FormData
): Promise<{ error?: string }> {
  const dealershipName = String(formData.get("dealershipName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!dealershipName || !contactName || !email || !phone) {
    return { error: "All fields are required." };
  }
  if (email.length < 3 || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  try {
    await db.betaAccessRequest.create({
      data: {
        dealershipName,
        contactName,
        email,
        phone,
        status: BetaAccessStatus.PENDING,
      },
    });
    return {};
  } catch (e) {
    console.error("[submitBetaRequestAction]", e);
    return { error: "Something went wrong. Please try again later." };
  }
}

/**
 * Super Admin action to approve a beta request.
 * provisions organization and creates an invite token.
 */
export async function approveBetaRequestAction(requestId: string, slugOverride?: string) {
  console.log(`[APPROVE] Started approval for request ${requestId}`);
  await requireWriteAccess();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required.");
  }

  const request = await db.betaAccessRequest.findUnique({
    where: { id: requestId }
  });

  if (!request || request.status !== BetaAccessStatus.PENDING) {
    console.error(`[APPROVE] Invalid request or already processed: ${requestId}`);
    throw new Error("Invalid request or already processed.");
  }

  console.log(`[APPROVE] Processing request for ${request.dealershipName}`);

  // Transactional provision
  const result = await db.$transaction(async (tx) => {
    // 1. Provision organization
    const rawSlug = slugOverride || request.dealershipName;
    const slug = normalizeSlug(rawSlug);
    
    if (slug.length < 3) {
      throw new Error(`The dealership name "${rawSlug}" results in an invalid URL slug. Please provide a custom slug.`);
    }

    console.log(`[APPROVE] Resolved slug: ${slug}`);
    
    // Check slug uniqueness within transaction
    const existingOrg = await tx.organization.findUnique({ where: { slug } });
    if (existingOrg) throw new Error(`Slug "${slug}" is already in use. Please provide a custom override.`);

    const org = await tx.organization.create({
      data: {
        name: request.dealershipName,
        slug: slug,
      }
    });
    console.log(`[APPROVE] Created organization ${org.id}`);

    // 2. Create Invite Token
    const rawToken = crypto.randomBytes(32).toString('hex');
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
    console.log(`[APPROVE] Created invite token for ${request.email}`);

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
    console.log(`[APPROVE] Updated request status to APPROVED`);

    return { org, rawToken };
  });

  // 4. Send Email (Outside transaction for reliability/latency)
  const baseUrl = process.env.APP_URL || "https://vehiclix.app";
  const inviteUrl = `${baseUrl}/setup-owner/${result.rawToken}`;
  
  console.log(`[APPROVE] Sending invite email to ${request.email}`);
  
  let mailResult: { success: boolean; error?: string } = { success: false, error: "Unknown error" };
  try {
    mailResult = await sendInviteEmail({
      email: request.email,
      dealershipName: request.dealershipName,
      inviteUrl,
    });
  } catch (e: any) {
    console.error(`[APPROVE] sendInviteEmail crash: ${e.message}`);
    mailResult = { success: false, error: e.message || "Failed to call email service" };
  }

  if (mailResult.success) {
    console.log(`[APPROVE] Invite email sent successfully`);
  } else {
    console.warn(`[APPROVE] Invite email failed: ${mailResult.error}`);
  }

  revalidatePath("/super-admin/requests");
  console.log(`[APPROVE] Completed approval flow for request ${requestId}`);
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
  console.log(`[REGENERATE] Started invite regeneration for org ${organizationId}`);
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
  const rawToken = crypto.randomBytes(32).toString('hex');
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
  
  console.log(`[REGENERATE] Sending new invite email to ${invite.email}`);
  let mailResult: { success: boolean; error?: string } = { success: false, error: "Unknown error" };
  try {
    mailResult = await sendInviteEmail({
      email: invite.email,
      dealershipName: org.name,
      inviteUrl,
    });
  } catch (e: any) {
    console.error(`[REGENERATE] sendInviteEmail crash: ${e.message}`);
    mailResult = { success: false, error: e.message || "Failed to call email service" };
  }

  revalidatePath("/super-admin/requests");
  console.log(`[REGENERATE] Completed regeneration for org ${organizationId}`);
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
  console.log(`[REJECT] Started rejection for request ${requestId}`);
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
  console.log(`[REJECT] Completed rejection for request ${requestId}`);
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

/**
 * Super Admin action to delete a beta request.
 */
export async function deleteBetaRequestAction(requestId: string) {
  await requireWriteAccess();
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required.");
  }

  const request = await db.betaAccessRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new Error("Request not found.");
  }

  await db.betaAccessRequest.delete({
    where: { id: requestId }
  });

  revalidatePath("/super-admin/requests");
  return { success: true };
}

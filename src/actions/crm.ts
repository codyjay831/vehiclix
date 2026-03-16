"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { LeadStatus, LeadActivityType, Role } from "@prisma/client";
import { createLeadActivity } from "@/lib/crm";
import { revalidatePath } from "next/cache";

/**
 * Adds a manual note to a lead.
 */
export async function addLeadNoteAction(leadId: string, body: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  // Verify lead ownership
  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { id: true },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  await createLeadActivity({
    leadId,
    organizationId: user.organizationId,
    type: LeadActivityType.NOTE,
    body,
    actorUserId: user.id,
  });

  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

/**
 * Updates a lead's pipeline status.
 */
export async function updateLeadStatusAction(leadId: string, newStatus: LeadStatus) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { id: true, status: true },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  if (lead.status === newStatus) return { success: true };

  await db.$transaction([
    db.lead.update({
      where: { id: leadId },
      data: { 
        status: newStatus,
        lastActivityAt: new Date(),
      },
    }),
    db.leadActivity.create({
      data: {
        leadId,
        organizationId: user.organizationId,
        type: LeadActivityType.STAGE_CHANGE,
        body: `Status updated from ${lead.status} to ${newStatus}`,
        actorUserId: user.id,
        metadataJson: { from: lead.status, to: newStatus },
      },
    }),
  ]);

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { success: true };
}

/**
 * Assigns a lead to a staff member.
 */
export async function assignLeadAction(leadId: string, assigneeId: string | null) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
    select: { id: true, assignedToId: true },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  // If assigning to a user, verify they belong to the same org
  if (assigneeId) {
    const assignee = await db.user.findFirst({
      where: { id: assigneeId, organizationId: user.organizationId },
      select: { firstName: true, lastName: true },
    });
    if (!assignee) throw new Error("Invalid assignee");
  }

  await db.$transaction([
    db.lead.update({
      where: { id: leadId },
      data: { 
        assignedToId: assigneeId,
        lastActivityAt: new Date(),
      },
    }),
    db.leadActivity.create({
      data: {
        leadId,
        organizationId: user.organizationId,
        type: LeadActivityType.ASSIGNMENT,
        body: assigneeId ? "Lead assigned" : "Lead unassigned",
        actorUserId: user.id,
        metadataJson: { assigneeId },
      },
    }),
  ]);

  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

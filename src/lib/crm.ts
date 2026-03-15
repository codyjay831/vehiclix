import { db } from "./db";
import { LeadStatus, LeadSource, LeadActivityType } from "@prisma/client";

/**
 * Finds an existing open lead for a specific customer, vehicle, and organization.
 * Used for simple deduplication logic.
 */
export async function findOpenLead(
  organizationId: string,
  customerEmail: string,
  vehicleId?: string
) {
  return db.lead.findFirst({
    where: {
      organizationId,
      customerEmail,
      vehicleId: vehicleId || null,
      status: {
        in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.APPOINTMENT, LeadStatus.NEGOTIATING],
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Creates a new lead activity entry and updates the lead's lastActivityAt timestamp.
 */
export async function createLeadActivity({
  leadId,
  organizationId,
  type,
  body,
  actorUserId,
  metadataJson,
}: {
  leadId: string;
  organizationId: string;
  type: LeadActivityType;
  body?: string;
  actorUserId?: string;
  metadataJson?: any;
}) {
  return db.$transaction([
    db.leadActivity.create({
      data: {
        leadId,
        organizationId,
        type,
        body,
        actorUserId,
        metadataJson,
      },
    }),
    db.lead.update({
      where: { id: leadId },
      data: { lastActivityAt: new Date() },
    }),
  ]);
}

/**
 * Ensures a lead exists for an incoming public action (inquiry, request, etc.)
 * If an open lead exists for the same email + vehicle, it appends an activity.
 * Otherwise, it creates a new lead.
 */
export async function ensureLeadForInbound({
  organizationId,
  source,
  customerEmail,
  customerName,
  customerPhone,
  vehicleId,
  customerId,
  initialActivityBody,
}: {
  organizationId: string;
  source: LeadSource;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  vehicleId?: string;
  customerId?: string;
  initialActivityBody: string;
}) {
  // 1. Check for existing open lead
  const existingLead = await findOpenLead(organizationId, customerEmail, vehicleId);

  if (existingLead) {
    // 2. Append activity to existing lead
    await createLeadActivity({
      leadId: existingLead.id,
      organizationId,
      type: LeadActivityType.INBOUND,
      body: initialActivityBody,
      actorUserId: customerId,
    });
    return existingLead;
  }

  // 3. Create new lead
  return db.lead.create({
    data: {
      organizationId,
      source,
      status: LeadStatus.NEW,
      customerEmail,
      customerName,
      customerPhone,
      vehicleId,
      customerId,
      lastActivityAt: new Date(),
      activities: {
        create: {
          organizationId,
          type: LeadActivityType.INBOUND,
          body: initialActivityBody,
          actorUserId: customerId,
        },
      },
    },
  });
}

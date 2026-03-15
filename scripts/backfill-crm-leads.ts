import { PrismaClient, LeadStatus, LeadSource, LeadActivityType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Historical Backfill Script for CRM Leads
 * 
 * This script converts historical VehicleInquiry, VehicleRequest, and Reservation records
 * into the new unified Lead model and LeadActivity timeline.
 * 
 * Idempotency:
 * Each backfilled activity stores the source record ID in its metadataJson. 
 * Before processing a record, the script checks if an activity with that source ID already exists.
 */

async function main() {
  console.log("🚀 Starting CRM Lead Backfill...");

  // 1. Backfill Vehicle Inquiries
  await backfillInquiries();

  // 2. Backfill Vehicle Requests (Sourcing)
  await backfillRequests();

  // 3. Backfill Reservations (Deals)
  await backfillReservations();

  console.log("✅ Backfill complete.");
}

async function backfillInquiries() {
  const inquiries = await prisma.vehicleInquiry.findMany({
    include: { vehicle: true },
  });

  console.log(`📥 Processing ${inquiries.length} inquiries...`);

  for (const inquiry of inquiries) {
    const sourceId = inquiry.id;
    
    // Idempotency check
    const existingActivity = await prisma.leadActivity.findFirst({
      where: {
        metadataJson: { path: ["sourceId"], equals: sourceId },
      },
    });

    if (existingActivity) continue;

    const email = inquiry.email.toLowerCase();
    const vehicleInfo = inquiry.vehicle ? `${inquiry.vehicle.year} ${inquiry.vehicle.make} ${inquiry.vehicle.model}` : "Unknown Vehicle";

    // Dedupe logic: find existing open lead
    let lead = await prisma.lead.findFirst({
      where: {
        organizationId: inquiry.organizationId,
        customerEmail: email,
        vehicleId: inquiry.vehicleId,
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
      },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId: inquiry.organizationId,
          source: LeadSource.INQUIRY,
          status: LeadStatus.NEW,
          customerName: `${inquiry.firstName} ${inquiry.lastName}`,
          customerEmail: email,
          customerPhone: inquiry.phone,
          vehicleId: inquiry.vehicleId,
          customerId: inquiry.userId,
          createdAt: inquiry.createdAt,
          lastActivityAt: inquiry.createdAt,
        },
      });
    }

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organizationId: inquiry.organizationId,
        type: LeadActivityType.INBOUND,
        body: `[Historical] Vehicle inquiry received for ${vehicleInfo}. Message: ${inquiry.message || "No message."}`,
        createdAt: inquiry.createdAt,
        metadataJson: { sourceId, sourceTable: "VehicleInquiry", backfilled: true },
      },
    });
  }
}

async function backfillRequests() {
  const requests = await prisma.vehicleRequest.findMany({
    include: { user: true },
  });

  console.log(`📥 Processing ${requests.length} vehicle requests...`);

  for (const request of requests) {
    const sourceId = request.id;
    
    const existingActivity = await prisma.leadActivity.findFirst({
      where: {
        metadataJson: { path: ["sourceId"], equals: sourceId },
      },
    });

    if (existingActivity) continue;

    const email = request.user.email.toLowerCase();

    let lead = await prisma.lead.findFirst({
      where: {
        organizationId: request.organizationId,
        customerEmail: email,
        source: LeadSource.VEHICLE_REQUEST,
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
      },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId: request.organizationId,
          source: LeadSource.VEHICLE_REQUEST,
          status: LeadStatus.NEW,
          customerName: `${request.user.firstName} ${request.user.lastName}`,
          customerEmail: email,
          customerPhone: request.user.phone,
          customerId: request.userId,
          createdAt: request.createdAt,
          lastActivityAt: request.createdAt,
        },
      });
    }

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organizationId: request.organizationId,
        type: LeadActivityType.INBOUND,
        body: `[Historical] Vehicle sourcing request received for ${request.make} ${request.model}.`,
        createdAt: request.createdAt,
        metadataJson: { sourceId, sourceTable: "VehicleRequest", backfilled: true },
      },
    });
  }
}

async function backfillReservations() {
  // We only backfill reservations that are effectively 'leads' or in early stages
  const reservations = await prisma.deal.findMany({
    where: {
      OR: [
        { dealStatus: "LEAD" },
        { dealStatus: "DEPOSIT_PENDING" },
        { dealStatus: "DEPOSIT_RECEIVED" }
      ]
    },
    include: { user: true, vehicle: true },
  });

  console.log(`📥 Processing ${reservations.length} reservations...`);

  for (const deal of reservations) {
    const sourceId = deal.id;
    
    const existingActivity = await prisma.leadActivity.findFirst({
      where: {
        metadataJson: { path: ["sourceId"], equals: sourceId },
      },
    });

    if (existingActivity) continue;

    const email = deal.user.email.toLowerCase();
    const vehicleInfo = deal.vehicle ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}` : "Unknown Vehicle";

    let lead = await prisma.lead.findFirst({
      where: {
        organizationId: deal.organizationId,
        customerEmail: email,
        vehicleId: deal.vehicleId,
        status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
      },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId: deal.organizationId,
          source: LeadSource.RESERVATION,
          status: LeadStatus.NEW,
          customerName: `${deal.user.firstName} ${deal.user.lastName}`,
          customerEmail: email,
          customerPhone: deal.user.phone,
          vehicleId: deal.vehicleId,
          customerId: deal.userId,
          createdAt: deal.createdAt,
          lastActivityAt: deal.createdAt,
        },
      });
    }

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        organizationId: deal.organizationId,
        type: LeadActivityType.INBOUND,
        body: `[Historical] Vehicle reservation initiated for ${vehicleInfo}. Status at backfill: ${deal.dealStatus}`,
        createdAt: deal.createdAt,
        metadataJson: { sourceId, sourceTable: "Deal", backfilled: true },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

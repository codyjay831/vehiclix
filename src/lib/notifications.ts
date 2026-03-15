import { db } from "./db";
import { Role } from "@prisma/client";

interface LeadNotificationData {
  organizationId: string;
  vehicleInfo: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  message?: string | null;
}

/**
 * Triggers a lead notification to the dealer owner(s).
 */
export async function notifyDealerOfLead(data: LeadNotificationData) {
  const { organizationId, vehicleInfo, customerInfo, message } = data;

  try {
    // 1. Fetch the owner(s) of the organization
    const owners = await db.user.findMany({
      where: {
        organizationId,
        role: Role.OWNER,
      },
      select: {
        email: true,
        firstName: true,
      },
    });

    if (owners.length === 0) {
      console.warn(`No owners found for organization ${organizationId}. Notification could not be sent.`);
      return;
    }

    // 2. Prepare the notification (Email Simulation)
    const ownerEmails = owners.map((o) => o.email).join(", ");
    const subject = `New Vehicle Inquiry — ${vehicleInfo}`;
    const body = `
You have received a new inquiry.

Vehicle:
${vehicleInfo}

Customer:
${customerInfo.firstName} ${customerInfo.lastName}
${customerInfo.email}
${customerInfo.phone}

Message:
"${message || "I'm interested in this vehicle. Is it still available?"}"

View in Admin:
${process.env.APP_URL || "https://vehiclix.app"}/admin/inquiries
    `;

    // 3. Log the notification (Mocking SMTP)
    console.log("--------------------------------------------------");
    console.log("📧 EMAIL NOTIFICATION TRIGGERED");
    console.log(`TO: ${ownerEmails}`);
    console.log(`SUBJECT: ${subject}`);
    console.log("BODY:");
    console.log(body);
    console.log("--------------------------------------------------");

    // 4. Create an activity event for the notification
    await db.activityEvent.create({
      data: {
        eventType: "lead.notification_sent",
        entityType: "VehicleInquiry",
        entityId: "system", // Logic entity
        organizationId,
        actorRole: Role.CUSTOMER,
        metadata: {
          to: ownerEmails,
          vehicle: vehicleInfo,
        },
      },
    });

  } catch (error) {
    console.error("Failed to send lead notification:", error);
  }
}

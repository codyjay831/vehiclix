"use server";

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { VehicleStatus, DealStatus, PaymentStatus, Role, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

const FIXED_DEPOSIT_AMOUNT = 1000.00; // USD

export type ReservationResult = {
  success: boolean;
  clientSecret?: string;
  dealId?: string;
  error?: "VEHICLE_UNAVAILABLE" | "SERVER_ERROR";
  message?: string;
};

interface InitiateReservationData {
  vehicleId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
}

/**
 * Initiates a vehicle reservation by:
 * 1. Verifying vehicle is LISTED
 * 2. Creating/finding a stub User
 * 3. Creating a Deal (DEPOSIT_PENDING)
 * 4. Creating a DealDeposit (PENDING)
 * 5. Creating a Stripe PaymentIntent
 * 6. Returning the client secret and dealId
 */
export async function initiateVehicleReservationAction(data: InitiateReservationData): Promise<ReservationResult> {
  const { vehicleId, firstName, lastName, email, phone, message } = data;

  try {
    // 1. Transactional check and creation
    const result = await db.$transaction(async (tx) => {
      // 1.1 Verify vehicle is LISTED and get organization
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId },
        select: { id: true, vehicleStatus: true, price: true, organizationId: true },
      });

      if (!vehicle || vehicle.vehicleStatus !== VehicleStatus.LISTED || !vehicle.organizationId) {
        return { error: "VEHICLE_UNAVAILABLE" as const };
      }

      // 1.2 Identity Resolution (Stub Account)
      let user = await tx.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, organizationId: true },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            firstName,
            lastName,
            phone,
            role: Role.CUSTOMER,
            isStub: true,
            organizationId: vehicle.organizationId,
          },
        });
      } else if (!user.organizationId) {
        // If an existing stub account is missing an organization, assign it based on this reservation
        user = await tx.user.update({
          where: { id: user.id },
          data: { organizationId: vehicle.organizationId },
        });
      }

      // 1.3 Create Deal
      const deal = await tx.deal.create({
        data: {
          vehicleId,
          userId: user.id,
          organizationId: vehicle.organizationId,
          dealStatus: DealStatus.DEPOSIT_PENDING,
          purchasePrice: vehicle.price,
          depositAmount: new Prisma.Decimal(FIXED_DEPOSIT_AMOUNT),
        },
      });

      // 1.4 Create initial DealDeposit
      const dealDeposit = await tx.dealDeposit.create({
        data: {
          dealId: deal.id,
          depositAmount: new Prisma.Decimal(FIXED_DEPOSIT_AMOUNT),
          paymentStatus: PaymentStatus.PENDING,
        },
      });

      return { user, deal, dealDeposit };
    });

    if ("error" in result) {
      return { success: false, error: result.error };
    }

    // 2. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: FIXED_DEPOSIT_AMOUNT * 100, // Stripe expects cents
      currency: "usd",
      metadata: {
        dealId: result.deal.id,
        vehicleId: vehicleId,
        userId: result.user.id,
      },
      receipt_email: email,
    });

    // 3. Update DealDeposit with Stripe ID
    await db.dealDeposit.update({
      where: { id: result.dealDeposit.id },
      data: {
        stripePaymentId: paymentIntent.id,
      },
    });

    // 4. Log audit event
    await db.activityEvent.create({
      data: {
        eventType: "deposit.initiated",
        entityType: "Deal",
        entityId: result.deal.id,
        organizationId: result.deal.organizationId,
        actorId: result.user.id,
        actorRole: Role.CUSTOMER,
        metadata: {
          stripePaymentId: paymentIntent.id,
          amount: FIXED_DEPOSIT_AMOUNT,
        },
      },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret as string,
      dealId: result.deal.id,
    };

  } catch (error) {
    console.error("Reservation initiation failed:", error);
    return { success: false, error: "SERVER_ERROR", message: "Something went wrong. Please try again." };
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { PaymentStatus, DealStatus, VehicleStatus, Role } from "@prisma/client";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature") as string;

  let event;

  try {
    if (!endpointSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
    }
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const stripePaymentId = paymentIntent.id;

    try {
      // 1. Idempotency Check
      const dealDeposit = await db.dealDeposit.findUnique({
        where: { stripePaymentId },
        include: { deal: true },
      });

      if (!dealDeposit) {
        console.error(`DealDeposit not found for Stripe ID: ${stripePaymentId}`);
        return NextResponse.json({ error: "Deposit record not found" }, { status: 404 });
      }

      if (dealDeposit.paymentStatus === PaymentStatus.SUCCEEDED) {
        console.log(`Webhook handled: Deposit ${stripePaymentId} already succeeded.`);
        return NextResponse.json({ received: true });
      }

      // 2. Atomic Status Updates
      await db.$transaction(async (tx) => {
        // 2.1 Update Deposit
        await tx.dealDeposit.update({
          where: { id: dealDeposit.id },
          data: {
            paymentStatus: PaymentStatus.SUCCEEDED,
            paymentTimestamp: new Date(),
          },
        });

        // 2.2 Update Deal
        await tx.deal.update({
          where: { id: dealDeposit.dealId },
          data: {
            dealStatus: DealStatus.DEPOSIT_RECEIVED,
          },
        });

        // 2.3 Update Vehicle
        await tx.vehicle.update({
          where: { id: dealDeposit.deal.vehicleId },
          data: {
            vehicleStatus: VehicleStatus.RESERVED,
          },
        });

        // 2.4 Log Audit Event
        await tx.activityEvent.create({
          data: {
            eventType: "deposit.completed",
            entityType: "Deal",
            entityId: dealDeposit.dealId,
            actorRole: Role.CUSTOMER,
            metadata: { 
              stripePaymentId,
              vehicleId: dealDeposit.deal.vehicleId 
            },
          },
        });
      });

      console.log(`Successfully processed successful payment for Deal: ${dealDeposit.dealId}`);
    } catch (error) {
      console.error("Webhook transaction failed:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

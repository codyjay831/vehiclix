import { NextRequest, NextResponse } from "next/server";
import { stripe, syncSubscription } from "@/lib/stripe";
import Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("❌ STRIPE_WEBHOOK_SECRET is not defined");
    return new NextResponse("Webhook secret missing", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("No signature provided", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const eventType = event.type;

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.client_reference_id;
        const subscriptionId = session.subscription as string;

        if (organizationId && subscriptionId) {
          console.log(`✅ Provisioning subscription for Org: ${organizationId}`);
          await syncSubscription(subscriptionId, organizationId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🔄 Syncing subscription: ${subscription.id} (Status: ${subscription.status})`);
        await syncSubscription(subscription.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string;
          console.log(`📄 Syncing subscription from invoice: ${subscriptionId}`);
          await syncSubscription(subscriptionId);
        }
        break;
      }

      default:
        // Safely ignore unhandled events
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
    }

    return new NextResponse("Webhook received", { status: 200 });
  } catch (error: any) {
    console.error(`❌ Error processing webhook (${eventType}): ${error.message}`);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

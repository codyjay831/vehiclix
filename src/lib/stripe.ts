import Stripe from "stripe";
import { db } from "./db";
import { SubscriptionStatus, PlanKey } from "@prisma/client";
import { BILLING_PLANS } from "@/config/billing";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24-preview" as any,
});

/**
 * Maps Stripe subscription status to internal SubscriptionStatus enum.
 */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE;
    case "unpaid":
      return SubscriptionStatus.PAST_DUE;
    default:
      return SubscriptionStatus.NONE;
  }
}

/**
 * Syncs a Stripe subscription's state to the internal database.
 */
export async function syncSubscription(
  stripeSubscriptionId: string,
  organizationId?: string
) {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const stripeCustomerId = subscription.customer as string;
  const stripePriceId = subscription.items.data[0].price.id;

  // Resolve plan key from price ID
  const planKey = Object.values(BILLING_PLANS).find(
    (p) => p.priceId === stripePriceId
  )?.key || null;

  const data = {
    stripeSubscriptionId,
    stripeCustomerId,
    stripePriceId,
    planKey,
    status: mapStripeStatus(subscription.status),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  };

  if (organizationId) {
    return db.organizationSubscription.upsert({
      where: { organizationId },
      create: { ...data, organizationId },
      update: data,
    });
  }

  // If no organizationId, try to find by subscription ID first, then customer ID
  const existing = await db.organizationSubscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId },
        { stripeCustomerId },
      ],
    },
  });

  if (!existing) {
    console.warn(`⚠️ Could not find OrganizationSubscription for Stripe Sub: ${stripeSubscriptionId} or Customer: ${stripeCustomerId}`);
    return null;
  }

  return db.organizationSubscription.update({
    where: { id: existing.id },
    data,
  });
}

"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { PlanKey, Role } from "@prisma/client";
import { BILLING_PLANS } from "@/config/billing";
import { BRANDING } from "@/config/branding";

const APP_URL = process.env.APP_URL || `https://${BRANDING.platformDomain}`;

/**
 * Creates a Stripe Checkout Session for a dealership subscription.
 */
export async function createCheckoutSessionAction(planKey: PlanKey) {
  await requireWriteAccess();
  // 1. Auth & Role Check
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    throw new Error("Unauthorized: Owner or Support access required.");
  }

  const organizationId = user.organizationId;

  // 2. Validate Plan
  const plan = BILLING_PLANS[planKey];
  if (!plan || !plan.priceId) {
    throw new Error("Invalid billing plan selected.");
  }

  // 3. Resolve or Create Stripe Customer
  let subscription = await db.organizationSubscription.findUnique({
    where: { organizationId },
  });

  let stripeCustomerId = subscription?.stripeCustomerId;

  if (!stripeCustomerId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, phone: true },
    });

    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name || "Dealership",
      phone: org?.phone || undefined,
      metadata: {
        organizationId,
      },
    });

    stripeCustomerId = customer.id;

    // Persist customer ID to local DB
    subscription = await db.organizationSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeCustomerId,
      },
      update: {
        stripeCustomerId,
      },
    });
  }

  // 4. Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    client_reference_id: organizationId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${APP_URL}/admin/settings/billing?success=true`,
    cancel_url: `${APP_URL}/admin/settings/billing?canceled=true`,
    subscription_data: {
      metadata: {
        organizationId,
        planKey,
      },
    },
    metadata: {
      organizationId,
      planKey,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session.");
  }

  return { url: session.url };
}

/**
 * Creates a Stripe Billing Portal session for subscription management.
 */
export async function createBillingPortalAction() {
  await requireWriteAccess();
  // 1. Auth check
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    throw new Error("Unauthorized: Owner or Support access required.");
  }

  const organizationId = user.organizationId;

  // 2. Resolve Stripe Customer
  const subscription = await db.organizationSubscription.findUnique({
    where: { organizationId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("No billing history found. Please subscribe to a plan first.");
  }

  // 3. Create Portal Session
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${APP_URL}/admin/settings/billing`,
  });

  if (!session.url) {
    throw new Error("Failed to create billing portal session.");
  }

  return { url: session.url };
}

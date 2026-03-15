import { PlanKey } from "@prisma/client";

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  priceId: string; // From environment variable
  features: string[];
}

export const BILLING_PLANS: Record<PlanKey, PlanConfig> = {
  [PlanKey.STARTER]: {
    key: PlanKey.STARTER,
    name: "Starter",
    description: "Perfect for independent boutique dealerships.",
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    features: [
      "Branded Storefront",
      "Full Inventory Management",
      "Lead Capture & CRM",
      "Stripe Reservation Integration",
    ],
  },
  [PlanKey.PRO]: {
    key: PlanKey.PRO,
    name: "Pro",
    description: "Scale your reach with custom domains and advanced tools.",
    priceId: process.env.STRIPE_PRICE_PRO || "",
    features: [
      "Everything in Starter",
      "Custom Domain Mapping",
      "Homepage Content Builder",
      "Priority Sourcing Support",
    ],
  },
  [PlanKey.PREMIUM]: {
    key: PlanKey.PREMIUM,
    name: "Premium",
    description: "Complete operational suite for high-volume dealers.",
    priceId: process.env.STRIPE_PRICE_PREMIUM || "",
    features: [
      "Everything in Pro",
      "Multi-user Staff Accounts",
      "API Access",
      "Dedicated Account Manager",
    ],
  },
};

export const DEFAULT_PLAN = PlanKey.STARTER;
export const TRIAL_DAYS = 14;

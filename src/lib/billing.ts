import { SubscriptionStatus, PlanKey, OrganizationSubscription } from "@prisma/client";

/**
 * Shared gating logic for Vehiclix billing.
 * These helpers use the local DB snapshot only.
 */

export const PLAN_FEATURES = {
  [PlanKey.STARTER]: {
    customDomains: false,
    advancedCRM: false,
    multiUser: false,
  },
  [PlanKey.PRO]: {
    customDomains: true,
    advancedCRM: true,
    multiUser: false,
  },
  [PlanKey.PREMIUM]: {
    customDomains: true,
    advancedCRM: true,
    multiUser: true,
  },
};

/**
 * Determines if a feature is available for a given subscription.
 */
export function hasFeature(subscription: OrganizationSubscription | null, feature: keyof typeof PLAN_FEATURES[PlanKey.STARTER]): boolean {
  if (!subscription) return false;
  
  // Subscription must be in a "good" state to use premium features
  const isValidState = [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING
  ].includes(subscription.status);

  if (!isValidState) return false;

  const planKey = subscription.planKey;
  if (!planKey) return false;

  return PLAN_FEATURES[planKey][feature];
}

/**
 * Determines if the subscription is in a state that requires a warning banner.
 */
export function getBillingStatusInfo(subscription: OrganizationSubscription | null) {
  if (!subscription) {
    return {
      severity: "none",
      message: null,
      showBanner: false,
    };
  }

  switch (subscription.status) {
    case SubscriptionStatus.TRIALING:
      return {
        severity: "info",
        message: "Your 14-day trial is active. Enjoy all boutique features!",
        showBanner: true,
      };
    case SubscriptionStatus.PAST_DUE:
      return {
        severity: "warning",
        message: "Your latest payment failed. Please update your billing info to avoid service interruption.",
        showBanner: true,
      };
    case SubscriptionStatus.CANCELED:
      return {
        severity: "error",
        message: "Your subscription has been canceled. Renew now to restore full access.",
        showBanner: true,
      };
    case SubscriptionStatus.NONE:
    case SubscriptionStatus.INCOMPLETE:
      return {
        severity: "error",
        message: "Your subscription is incomplete. Finish setup to unlock features.",
        showBanner: true,
      };
    default:
      return {
        severity: "none",
        message: null,
        showBanner: false,
      };
  }
}

import { PrismaClient, SubscriptionStatus, PlanKey } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Initializes subscription records for all existing organizations.
 * Existing organizations are placed in a 14-day TRIALING state.
 */
async function main() {
  console.log("🚀 Initializing subscription records for existing organizations...");

  const orgs = await prisma.organization.findMany({
    include: { subscription: true },
  });

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

  let count = 0;
  for (const org of orgs) {
    if (!org.subscription) {
      await prisma.organizationSubscription.create({
        data: {
          organizationId: org.id,
          status: SubscriptionStatus.TRIALING,
          planKey: PlanKey.STARTER,
          trialEndsAt: trialEnd,
        },
      });
      count++;
    }
  }

  console.log(`✅ Initialized ${count} subscription records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUserWithOrg } from "@/lib/auth";
import { BillingManagement } from "@/components/admin/BillingManagement";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing & Subscription | Admin",
  description: "Manage your dealership subscription and billing settings.",
};

export default async function BillingSettingsPage() {
  const user = await requireUserWithOrg();

  const subscription = await db.organizationSubscription.findUnique({
    where: { organizationId: user.organizationId },
  });

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">
          Billing & <span className="text-primary">Subscription</span>
        </h2>
        <p className="text-muted-foreground text-sm font-medium max-w-2xl">
          Manage your dealership's plan, payment methods, and billing history.
        </p>
      </div>

      <BillingManagement subscription={subscription} />
    </div>
  );
}

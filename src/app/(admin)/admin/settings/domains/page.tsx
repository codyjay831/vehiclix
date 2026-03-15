import { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DomainManager } from "@/components/admin/DomainManager";

export const metadata: Metadata = {
  title: "Custom Domains | Admin",
  description: "Connect your own domain to your dealership storefront.",
};

export default async function DomainsSettingsPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "OWNER" || !user.organizationId) {
    redirect("/login");
  }

  const domains = await db.organizationDomain.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const subscription = await db.organizationSubscription.findUnique({
    where: { organizationId: user.organizationId },
  });

  return (
    <div className="p-4 md:p-8">
      <DomainManager domains={domains} subscription={subscription || null} />
    </div>
  );
}

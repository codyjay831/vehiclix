import { Metadata } from "next";
import { requireUserWithOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { StorefrontEditorForm } from "@/components/admin/StorefrontEditorForm";

export const metadata: Metadata = {
  title: "Storefront | Settings",
  description: "Manage your public storefront content and appearance.",
};

export default async function StorefrontSettingsPage() {
  const user = await requireUserWithOrg();

  const [branding, homepage, org] = await Promise.all([
    db.organizationBranding.findUnique({
      where: { organizationId: user.organizationId },
    }),
    db.organizationHomepage.findUnique({
      where: { organizationId: user.organizationId },
    }),
    db.organization.findUnique({
      where: { id: user.organizationId },
      select: { slug: true },
    }),
  ]);

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">
          Storefront <span className="text-primary">Settings</span>
        </h2>
        <p className="text-muted-foreground text-sm font-medium max-w-2xl">
          Control your public website content, homepage sections, and business information — all in one place.
        </p>
      </div>

      <StorefrontEditorForm
        branding={branding}
        homepage={homepage}
        storefrontUrl={org?.slug ? `/${org.slug}` : null}
      />
    </div>
  );
}

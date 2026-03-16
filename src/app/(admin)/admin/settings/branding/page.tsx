import { Metadata } from "next";
import { requireUserWithOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { BrandingEditorForm } from "@/components/admin/BrandingEditorForm";

export const metadata: Metadata = {
  title: "Website Branding | Admin",
  description: "Customize your dealership storefront branding.",
};

export default async function BrandingSettingsPage() {
  const user = await requireUserWithOrg();

  const branding = await db.organizationBranding.findUnique({
    where: { organizationId: user.organizationId },
  });

  return (
    <div className="p-4 md:p-8 space-y-8">
      <BrandingEditorForm initialData={branding} />
    </div>
  );
}

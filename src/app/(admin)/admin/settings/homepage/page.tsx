import { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

import { HomepageEditorForm } from "@/components/admin/HomepageEditorForm";

export const metadata: Metadata = {
  title: "Homepage Editor | Admin",
  description: "Customize your dealership landing page content.",
};

export default async function HomepageSettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    redirect("/login");
  }

  const homepage = await db.organizationHomepage.findUnique({
    where: { organizationId: user.organizationId },
  });

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">
          Landing Page <span className="text-primary">Content</span>
        </h2>
        <p className="text-muted-foreground text-sm font-medium max-w-2xl">
          Customize your dealership storefront homepage with promotional sections, trust badges, and featured content.
        </p>
      </div>

      <HomepageEditorForm initialData={homepage} />
    </div>
  );
}

import { Metadata } from "next";
import { requireUserWithOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsNav } from "@/components/admin/SettingsNav";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings | Admin",
};

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserWithOrg();

  if (user.role === Role.STAFF) {
    redirect("/admin");
  }

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { slug: true, name: true },
  });

  return (
    <div className="p-4 md:p-8 space-y-8 bg-muted/30 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/admin"
            className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.8] italic">
            Dealership <br />
            <span className="text-primary">Settings</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-xl">
            Manage the identity and technical configuration for <span className="text-foreground font-bold">{org?.name}</span>.
          </p>
        </div>
        
        {org?.slug && (
          <Button asChild variant="outline" className="h-12 px-6 font-bold uppercase tracking-wider italic gap-2 group">
            <Link href={`/${org.slug}`} target="_blank">
              <Globe className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              View Storefront
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <SettingsNav />
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

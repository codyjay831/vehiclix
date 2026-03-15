import * as React from "react";
import { redirect } from "next/navigation";
import { resolvePortalIdentity, getActiveDeal } from "@/lib/portal";
import { ensureDocumentPlaceholders } from "@/lib/document";
import { DocumentUploadZone } from "@/components/portal/DocumentUploadZone";
import { FileText, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { BRANDING } from "@/config/branding";

export default async function DocumentsPage() {
  const user = await resolvePortalIdentity();
  if (!user) {
    redirect("/login");
  }

  // Safety: Ensure organization context is present to avoid downstream crashes
  if (!user.organizationId) {
    console.error(`Portal user ${user.id} (${user.email}) missing organization context.`);
    redirect("/login");
  }

  const activeDeal = await getActiveDeal(user.id, user.organizationId);

  const organization = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { slug: true, name: true },
  });

  if (!activeDeal) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center space-y-8 animate-in fade-in duration-700">
        <div className="bg-primary/5 p-12 rounded-[3rem] border-2 border-dashed border-primary/20 max-w-2xl mx-auto space-y-6 shadow-sm">
          <div className="bg-white p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-sm ring-1 ring-primary/10">
            <FileText className="h-10 w-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight italic text-primary leading-none">
              No Active Transaction
            </h1>
            <p className="text-sm font-medium text-muted-foreground italic leading-relaxed pt-2">
              You don't have an active vehicle purchase. Documents are only required for in-progress deals.
            </p>
          </div>
          <div className="pt-6">
            <Link href={organization ? `/${organization.slug}/inventory` : "/inventory"}>
              <Button className="rounded-full h-14 px-12 font-black uppercase tracking-widest shadow-xl">
                Browse Inventory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ensure placeholders exist and get the documents
  const documents = await ensureDocumentPlaceholders(activeDeal.id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 lg:py-24 space-y-12">
      <div className="space-y-6">
        <Link href="/portal">
          <Button variant="ghost" size="sm" className="pl-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors">
            <ChevronLeft className="mr-1 h-3 w-3" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/5 p-2 rounded-lg text-primary shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight italic text-primary">
                Secure Upload Center
              </h1>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] italic">
                Required <span className="text-primary">Documentation</span>
              </h2>
              <p className="text-sm font-medium text-muted-foreground italic mt-2 ml-1">
                Please provide the following documents to finalize your purchase of the {activeDeal.vehicle.year} {activeDeal.vehicle.make} {activeDeal.vehicle.model}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {documents.map((doc) => (
          <DocumentUploadZone
            key={doc.id}
            dealId={activeDeal.id}
            documentId={doc.id}
            documentType={doc.documentType}
            status={doc.documentStatus}
            fileUrl={doc.fileUrl}
          />
        ))}
      </div>

      <div className="bg-muted/30 border-2 rounded-[2.5rem] p-10 mt-12">
        <div className="max-w-3xl space-y-6">
          <div className="bg-white p-3 rounded-2xl w-fit shadow-sm ring-1 ring-primary/5 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight italic">Your Privacy is Protected</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
              All documents are stored in a private, encrypted environment. They are only accessible by {organization?.name || BRANDING.companyName} authorized staff for the purpose of verifying your transaction. We never share your personal data with third parties without your explicit consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

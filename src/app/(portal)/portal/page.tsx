import * as React from "react";
import { redirect } from "next/navigation";
import { resolvePortalIdentity, getActiveDeal, getRecentInquiries, getRecentRequests } from "@/lib/portal";
import { PortalDashboardHeader } from "@/components/portal/PortalDashboardHeader";
import { PortalDashboardContent } from "@/components/portal/PortalDashboardContent";
import { hasPendingDocuments } from "@/lib/document";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PortalPage() {
  // Resolve user record using real session or mock fallback
  const user = await resolvePortalIdentity();

  // Reject access if identity cannot be resolved
  if (!user) {
    redirect("/login");
  }

  // Safety: If organizationId is missing for a portal user, redirect to login
  // which will force session refresh. This prevents a crash in getActiveDeal.
  if (!user.organizationId) {
    console.error(`Portal user ${user.id} (${user.email}) missing organization context.`);
    redirect("/login");
  }

  // Fetch dashboard data in parallel
  const [activeDeal, recentInquiries, recentRequests] = await Promise.all([
    getActiveDeal(user.id, user.organizationId),
    getRecentInquiries(user.id, user.organizationId),
    getRecentRequests(user.id, user.organizationId),
  ]);

  const showDocsAlert = activeDeal ? await hasPendingDocuments(activeDeal.id) : false;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 lg:py-24 space-y-12">
      <PortalDashboardHeader user={user} />
      
      {showDocsAlert && (
        <div className="bg-amber-50 border-2 border-amber-200/50 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-6">
            <div className="bg-amber-100 p-4 rounded-2xl text-amber-700 shadow-sm">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black uppercase tracking-tight italic text-amber-900 leading-none">Action Required: Documents Needed</h3>
              <p className="text-sm font-medium text-amber-800/70 italic">Please provide your ID and insurance to proceed with your purchase.</p>
            </div>
          </div>
          <Link href="/portal/documents">
            <Button className="rounded-full h-14 px-10 font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white shadow-xl group">
              Upload Documents
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      )}

      <PortalDashboardContent 
        activeDeal={activeDeal}
        recentInquiries={recentInquiries}
        recentRequests={recentRequests}
      />
    </div>
  );
}

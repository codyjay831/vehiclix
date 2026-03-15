import * as React from "react";
import { getBetaRequestsAction } from "@/actions/beta";
import { BetaActions } from "@/components/admin/BetaActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BetaAccessStatus } from "@prisma/client";

export default async function BetaRequestsPage() {
  const requests = await getBetaRequestsAction();

  const getStatusBadge = (status: BetaAccessStatus) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black uppercase tracking-widest text-[10px]">Pending Review</Badge>;
      case "APPROVED":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 font-black uppercase tracking-widest text-[10px]">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20 font-black uppercase tracking-widest text-[10px]">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight italic">Beta Access Requests</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">Manage dealership onboarding queue</p>
        </div>
      </div>

      <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Dealership Applications ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dealership</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-bold italic">No requests found.</td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-black uppercase tracking-tight italic text-sm">{request.dealershipName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(request.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{request.contactName}</div>
                        <div className="text-xs text-muted-foreground">{request.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <BetaActions 
                          requestId={request.id} 
                          organizationId={request.organizationId} 
                          status={request.status} 
                        />
                        {request.status === "REJECTED" && (
                          <div className="text-[10px] font-black uppercase text-red-600/60 max-w-[200px] truncate ml-auto italic" title={request.rejectionReason || ""}>
                            {request.rejectionReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

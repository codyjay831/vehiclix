import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CarFront, FileText, LayoutDashboard, Settings, MessageSquare, ClipboardList, AlertCircle, Info } from "lucide-react";

export default function AdminPage() {
  const stats = [
    { label: "Inventory", value: "Manage", icon: CarFront, href: "/admin/inventory", color: "text-blue-600" },
    { label: "Inquiries", value: "View", icon: MessageSquare, href: "/admin/inquiries", color: "text-green-600" },
    { label: "Requests", value: "Review", icon: ClipboardList, href: "/admin/requests", color: "text-amber-600" },
    { label: "Deals", value: "Track", icon: FileText, href: "/admin/deals", color: "text-purple-600" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your dealership operations.</p>
        </div>
        
        <div className="bg-amber-50 border-2 border-amber-100 rounded-xl px-4 py-2 flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-tight italic">
          <AlertCircle className="h-4 w-4" />
          Controlled Pilot Mode Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-2 hover:border-primary/20 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage your {stat.label.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-2 border-dashed bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Pilot Limitations & Guidance
          </CardTitle>
          <CardDescription className="text-xs font-medium italic">
            Important information for external pilot participants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Global Branding</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The public marketing website currently defaults to platform branding. 
                Custom dealer subdomains and white-labeling are scheduled for Phase 4.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Shared Integrations</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Stripe payments and DocuSign contracts flow through the platform's global accounts. 
                Funds and documents are isolated by Organization ID in the dashboard.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Customer Invites</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                To associate customers with your dealership, ensure they register using your 
                unique organization registration link provided during onboarding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import * as React from "react";
import { getPlatformMetricsAction } from "@/actions/super-admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, CarFront, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SuperAdminDashboardPage() {
  const metrics = await getPlatformMetricsAction();

  const statCards = [
    {
      label: "Total Organizations",
      value: metrics.totalOrgs,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Users",
      value: metrics.totalUsers,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-500/10",
    },
    {
      label: "Total Vehicles",
      value: metrics.totalVehicles,
      icon: CarFront,
      color: "text-purple-600",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight italic">Platform Dashboard</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            System-wide overview and metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm group hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                  <h3 className="text-4xl font-black italic tracking-tighter">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b p-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Recent Dealerships</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-primary/5">
              {metrics.recentOrgs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-bold italic">No organizations found.</div>
              ) : (
                metrics.recentOrgs.map((org) => (
                  <div key={org.id} className="p-6 flex items-center justify-between hover:bg-muted/5 transition-colors group">
                    <div>
                      <Link href={`/super-admin/dealerships/${org.id}`} className="font-black uppercase tracking-tight italic text-sm group-hover:text-primary transition-colors">
                        {org.name}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">slug: {org.slug}</div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </div>
                      <Link href={`/super-admin/dealerships/${org.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm p-8 flex flex-col justify-center items-center text-center space-y-6">
          <div className="bg-primary/10 p-6 rounded-3xl">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight italic">Platform Health</h3>
            <p className="text-muted-foreground font-medium text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              System is operational. Multi-tenant isolation is active across {metrics.totalOrgs} dealers.
            </p>
          </div>
          <Link href="/super-admin/requests">
            <Button className="h-12 px-8 rounded-full font-black uppercase tracking-widest shadow-lg group">
              Manage Onboarding
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

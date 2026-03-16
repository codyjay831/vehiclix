import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationByIdAction } from "@/actions/super-admin";
import { DealershipQuickActions } from "@/components/super-admin/DealershipQuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ArrowLeft,
  Users,
  Car,
  Calendar,
  Globe,
  CreditCard,
  UserCog,
} from "lucide-react";
import { Role } from "@prisma/client";
import { BRANDING } from "@/config/branding";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DealershipDetailPage({ params }: PageProps) {
  const { id } = await params;
  const organization = await getOrganizationByIdAction(id);

  if (!organization) {
    notFound();
  }

  const primaryDomain =
    organization.domains?.find((d) => d.isPrimary) ||
    organization.domains?.[0];
  const sub = organization.subscription;
  const planLabel = sub?.planKey ?? "—";
  const statusLabel = sub?.status ?? "NONE";

  const summaryCards = [
    {
      label: "Vehicles",
      value: organization._count.vehicles,
      icon: Car,
    },
    {
      label: "Users",
      value: organization._count.users,
      icon: Users,
    },
    {
      label: "Plan",
      value: planLabel,
      icon: CreditCard,
    },
    {
      label: "Status",
      value: statusLabel,
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/dealerships">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight italic">
                {organization.name}
              </h1>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
                Dealership detail · Platform management
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                organization.status === "SUSPENDED"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {organization.status === "SUSPENDED" ? "Suspended" : "Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                    {label}
                  </p>
                  <p className="text-xl font-black italic tracking-tighter">
                    {String(value)}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main info + users + subscription */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">Name</span>
                  <span className="font-bold">{organization.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Slug</span>
                  <span className="font-mono font-bold">/{organization.slug}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-medium">
                    Primary domain
                  </span>
                  <span className="font-mono font-bold">
                    {primaryDomain?.hostname ??
                      `${BRANDING.platformDomain}/${organization.slug}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-medium">
                    Created
                  </span>
                  <span className="font-bold">
                    {new Date(organization.createdAt).toLocaleDateString(
                      undefined,
                      {
                        dateStyle: "medium",
                      }
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className="text-muted-foreground font-medium">
                    Account status
                  </span>
                  <span
                    className={`font-bold ${
                      organization.status === "SUSPENDED"
                        ? "text-destructive"
                        : "text-green-600"
                    }`}
                  >
                    {organization.status === "SUSPENDED"
                      ? "Suspended"
                      : "Active"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Subscription &amp; status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">
                    Plan
                  </span>
                  <span className="font-bold">{planLabel}</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium block mb-1">
                    Status
                  </span>
                  <span className="font-bold">{statusLabel}</span>
                </div>
                {sub?.currentPeriodEnd && (
                  <div>
                    <span className="text-muted-foreground font-medium block mb-1">
                      Period end
                    </span>
                    <span className="font-bold">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {sub?.trialEndsAt && (
                  <div>
                    <span className="text-muted-foreground font-medium block mb-1">
                      Trial ends
                    </span>
                    <span className="font-bold">
                      {new Date(sub.trialEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {sub?.cancelAtPeriodEnd && (
                  <div className="sm:col-span-2">
                    <span className="text-amber-600 font-bold">
                      Cancels at period end
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Users
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Owner/admin users highlighted
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-primary/5">
                {organization.users.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground font-medium">
                    No users
                  </div>
                ) : (
                  organization.users.map((u) => {
                    const role = u.role as Role;
                    const isOwnerAdmin = role === Role.OWNER;
                    return (
                      <div
                        key={u.id}
                        className={`p-6 flex items-center justify-between ${
                          isOwnerAdmin ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                              isOwnerAdmin ? "bg-primary/20" : "bg-muted"
                            }`}
                          >
                            <UserCog
                              className={`h-5 w-5 ${
                                isOwnerAdmin ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                          <div>
                            <div className="font-bold">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {u.email}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                              {u.role}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions sidebar */}
        <div className="lg:col-span-1">
          <DealershipQuickActions
            organizationId={organization.id}
            slug={organization.slug}
            status={organization.status}
          />
        </div>
      </div>

      <div className="flex justify-start">
        <Link href="/super-admin/dealerships">
          <Button variant="outline" size="sm" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to directory
          </Button>
        </Link>
      </div>
    </div>
  );
}

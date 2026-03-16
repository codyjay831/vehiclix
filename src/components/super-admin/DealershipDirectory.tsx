"use client";

import * as React from "react";
import Link from "next/link";
import { startSupportSession } from "@/actions/support";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ExternalLink, Building2, Users, Car, Eye } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status?: "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  branding: {
    contactEmail: string | null;
  } | null;
  _count: {
    vehicles: number;
    users: number;
  };
}

export function DealershipDirectory({ organizations }: { organizations: Organization[] }) {
  const [search, setSearch] = React.useState("");
  const [isPending, setIsPending] = React.useState<string | null>(null);

  const filteredOrgs = organizations.filter((org) => {
    const searchLower = search.toLowerCase();
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.slug.toLowerCase().includes(searchLower) ||
      org.branding?.contactEmail?.toLowerCase().includes(searchLower)
    );
  });

  const handleStartPreview = async (orgId: string) => {
    setIsPending(orgId);
    try {
      await startSupportSession(orgId);
    } catch (err: any) {
      toast.error(err.message || "Failed to start preview session");
      setIsPending(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, slug, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 rounded-2xl border-2 border-primary/10 focus:border-primary/30 transition-all bg-white/50 backdrop-blur-sm"
        />
      </div>

      <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30 border-b p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Active Dealerships ({filteredOrgs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dealership</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stats</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-bold italic">
                      No dealerships matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary/40" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div>
                              <Link
                                href={`/super-admin/dealerships/${org.id}`}
                                className="font-black uppercase tracking-tight italic text-sm hover:text-primary transition-colors block"
                              >
                                {org.name}
                              </Link>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                /{org.slug}
                              </div>
                            </div>
                            {org.status === "SUSPENDED" && (
                              <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-destructive/15 text-destructive">
                                Suspended
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <Car className="h-3 w-3" />
                            {org._count.vehicles}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {org._count.users}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{org.branding?.contactEmail || "No email"}</div>
                        <div className="text-[10px] text-muted-foreground italic">
                          Joined {new Date(org.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/super-admin/dealerships/${org.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              <Eye className="h-3 w-3 mr-1.5" />
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 border-amber-500/20 hover:bg-amber-50 hover:border-amber-500/40 transition-all"
                            disabled={isPending !== null}
                            onClick={() => handleStartPreview(org.id)}
                          >
                            {isPending === org.id ? (
                              "Loading..."
                            ) : (
                              <>
                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                Preview as Dealer
                              </>
                            )}
                          </Button>
                        </div>
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

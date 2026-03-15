"use client";

import { useState } from "react";
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  Star,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addDomainAction, deleteDomainAction, verifyDomainAction, setPrimaryDomainAction } from "@/actions/domain";
import { toast } from "sonner";
import { OrganizationDomain, DomainStatus, OrganizationSubscription } from "@prisma/client";
import { hasFeature } from "@/lib/billing";
import { cn } from "@/lib/utils";

interface DomainManagerProps {
  domains: OrganizationDomain[];
  subscription: OrganizationSubscription | null;
}

export function DomainManager({ domains: initialDomains, subscription }: DomainManagerProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [newHostname, setNewHostname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const canAddDomain = hasFeature(subscription, "customDomains");

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname) return;

    setIsLoading(true);
    const result = await addDomainAction(newHostname);
    setIsLoading(false);

    if (result.success && result.domain) {
      setDomains([result.domain, ...domains]);
      setNewHostname("");
      toast.success("Domain added! Please follow the verification instructions.");
    } else {
      toast.error(result.error || "Failed to add domain.");
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to delete this domain? This cannot be undone.")) return;

    setIsLoading(true);
    const result = await deleteDomainAction(id);
    setIsLoading(false);

    if (result.success) {
      setDomains(domains.filter((d) => d.id !== id));
      toast.success("Domain deleted.");
    } else {
      toast.error(result.error || "Failed to delete domain.");
    }
  };

  const handleVerifyDomain = async (id: string) => {
    setIsVerifying(id);
    const result = await verifyDomainAction(id);
    setIsVerifying(null);

    if (result.success) {
      setDomains(domains.map(d => d.id === id ? { ...d, status: DomainStatus.VERIFIED, verifiedAt: new Date() } : d));
      toast.success("Domain verified successfully!");
    } else {
      toast.error(result.error || "Verification failed. DNS records may take time to propagate.");
    }
  };

  const handleSetPrimary = async (id: string) => {
    setIsLoading(true);
    const result = await setPrimaryDomainAction(id);
    setIsLoading(false);

    if (result.success) {
      setDomains(domains.map(d => ({ ...d, isPrimary: d.id === id })));
      toast.success("Primary domain updated.");
    } else {
      toast.error(result.error || "Failed to set primary domain.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-8">
      {/* Add Domain Form */}
      <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-2xl font-black uppercase tracking-tight italic">
            Connect <span className="text-primary">New Domain</span>
          </CardTitle>
          <CardDescription className="font-medium">
            Enter the domain you want to use for your storefront (e.g., evomotors.com).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!canAddDomain ? (
            <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-6 flex flex-col items-center text-center gap-4">
              <Sparkles className="h-8 w-8 text-amber-600" />
              <div className="space-y-1">
                <p className="font-black uppercase tracking-tight italic text-amber-700">Premium Feature: Custom Domains</p>
                <p className="text-sm text-amber-600/80 font-medium max-w-md">
                  Custom domain mapping is available on Pro and Premium plans. 
                  Upgrade your subscription to connect your own domain.
                </p>
              </div>
              <Button asChild variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold uppercase italic h-10 px-6">
                <Link href="/admin/settings/billing">Upgrade Now</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAddDomain} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="yoursite.com"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value.toLowerCase())}
                  className="pl-10 h-12 font-bold tracking-wider"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !newHostname}
                className="h-12 px-8 font-black uppercase tracking-widest italic gap-2 transition-all active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Add Domain
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Domain List */}
      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
          Your <span className="text-primary">Domains</span>
          <Badge variant="outline" className="font-bold ml-2">{domains.length}</Badge>
        </h2>

        {domains.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-bold uppercase tracking-wider italic">No custom domains connected yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {domains.map((domain) => (
              <Card key={domain.id} className={cn(
                "group transition-all hover:shadow-md border-l-4",
                domain.isPrimary ? "border-l-primary" : "border-l-transparent"
              )}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-tight italic group-hover:text-primary transition-colors">
                          {domain.hostname}
                        </span>
                        {domain.isPrimary && (
                          <Badge className="bg-primary text-primary-foreground font-black uppercase text-[10px] italic tracking-widest py-0">
                            Primary
                          </Badge>
                        )}
                        <StatusBadge status={domain.status} />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Added on {new Date(domain.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {domain.status === DomainStatus.PENDING && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={isVerifying === domain.id || isLoading}
                          className="font-bold uppercase italic h-9 px-4 gap-2 active:scale-95"
                        >
                          {isVerifying === domain.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Verify Now
                        </Button>
                      )}
                      
                      {domain.status === DomainStatus.VERIFIED && !domain.isPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(domain.id)}
                          disabled={isLoading}
                          className="font-bold uppercase italic h-9 px-4 gap-2 hover:bg-primary/5 hover:text-primary active:scale-95"
                        >
                          <Star className="h-3 w-3" />
                          Set Primary
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDomain(domain.id)}
                        disabled={isLoading}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {domain.status === DomainStatus.PENDING && (
                    <div className="bg-muted/50 border-t p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-black uppercase tracking-tight italic text-sm">Action Required: DNS Verification</p>
                          <p className="text-sm text-muted-foreground font-medium">
                            To prove you own this domain, please add the following TXT record to your domain's DNS settings.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid md:grid-cols-[100px_1fr_auto] items-center gap-4 bg-background p-3 rounded-lg border text-sm font-mono">
                          <span className="text-muted-foreground uppercase font-sans font-black text-xs">Type</span>
                          <span className="font-bold">TXT</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("TXT")}><Copy className="h-3 w-3" /></Button>
                        </div>
                        <div className="grid md:grid-cols-[100px_1fr_auto] items-center gap-4 bg-background p-3 rounded-lg border text-sm font-mono">
                          <span className="text-muted-foreground uppercase font-sans font-black text-xs">Host</span>
                          <span className="font-bold">@</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard("@")}><Copy className="h-3 w-3" /></Button>
                        </div>
                        <div className="grid md:grid-cols-[100px_1fr_auto] items-center gap-4 bg-background p-3 rounded-lg border text-sm font-mono overflow-hidden">
                          <span className="text-muted-foreground uppercase font-sans font-black text-xs">Value</span>
                          <span className="font-bold truncate">{domain.verificationToken}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(domain.verificationToken || "")}><Copy className="h-3 w-3" /></Button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex-1 w-full">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Coming Soon: Hosting Instructions</p>
                          <p className="text-xs font-medium text-muted-foreground">
                            Once verified, we will provide the CNAME/A records to route traffic to your Vehiclix storefront.
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild 
                          className="font-bold uppercase italic gap-2 h-10 w-full sm:w-auto"
                        >
                          <a href="https://help.vehiclix.app/domains" target="_blank">
                            Help Center
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DomainStatus }) {
  switch (status) {
    case DomainStatus.VERIFIED:
      return (
        <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/5 font-black uppercase text-[10px] italic tracking-widest py-0">
          Verified
        </Badge>
      );
    case DomainStatus.PENDING:
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500 bg-amber-500/5 font-black uppercase text-[10px] italic tracking-widest py-0">
          Pending
        </Badge>
      );
    case DomainStatus.FAILED:
      return (
        <Badge variant="outline" className="text-destructive border-destructive bg-destructive/5 font-black uppercase text-[10px] italic tracking-widest py-0">
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VehicleWithMedia } from "@/types";
import { 
  Facebook, 
  FileText, 
  Mail, 
  Share2, 
  ExternalLink, 
  Globe, 
  MessageSquare, 
  Copy,
  Check
} from "lucide-react";
import { ListingGeneratorModal, GeneratorType } from "./ListingGeneratorModal";
import { toast } from "sonner";
import { trackVehicleShareAction } from "@/actions/inventory";

interface DistributionPanelProps {
  vehicle: VehicleWithMedia;
}

export function DistributionPanel({ vehicle }: DistributionPanelProps) {
  const [activeType, setActiveType] = React.useState<GeneratorType | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const copyListingLink = async () => {
    const url = `${window.location.origin}/${vehicle.organization.slug}/inventory/${vehicle.id}`;
    await navigator.clipboard.writeText(url);
    await trackVehicleShareAction(vehicle.id, vehicle.organizationId);
    setCopiedLink(true);
    toast.success("Link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openSmsShare = async () => {
    const url = `${window.location.origin}/${vehicle.organization.slug}/inventory/${vehicle.id}`;
    const text = `Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model}: ${url}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`);
    await trackVehicleShareAction(vehicle.id, vehicle.organizationId);
  };

  return (
    <Card className="shadow-sm border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 uppercase tracking-tighter font-black">
          <Share2 className="h-5 w-5 text-primary" />
          Distribution
        </CardTitle>
        <CardDescription className="font-medium">
          Share this listing across multiple sales channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dealer Website */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Direct Link</label>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 font-bold h-10" onClick={copyListingLink}>
              {copiedLink ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
              {copiedLink ? "Copied" : "Copy Link"}
            </Button>
            <Button variant="outline" className="px-3 h-10" asChild title="Open Public Page">
              <a href={`/${vehicle.organization.slug}/inventory/${vehicle.id}`} target="_blank">
                <Globe className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Facebook */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Facebook</label>
          <Button className="font-bold h-10 bg-[#1877F2] hover:bg-[#166fe5]" onClick={() => setActiveType("FACEBOOK")}>
            <Facebook className="mr-2 h-4 w-4" />
            Post to Facebook
          </Button>
        </div>

        {/* Craigslist */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Craigslist</label>
          <Button variant="outline" className="font-bold h-10 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700" onClick={() => setActiveType("CRAIGSLIST")}>
            <FileText className="mr-2 h-4 w-4" />
            Post to Craigslist
          </Button>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
          <Button variant="outline" className="font-bold h-10 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700" onClick={() => setActiveType("EMAIL")}>
            <Mail className="mr-2 h-4 w-4" />
            Send Email Template
          </Button>
        </div>

        {/* SMS Share Link */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Mobile Share</label>
          <Button variant="secondary" className="font-bold h-10" onClick={openSmsShare}>
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS Share Link
          </Button>
        </div>
      </CardContent>

      {activeType && (
        <ListingGeneratorModal
          vehicle={vehicle}
          type={activeType}
          isOpen={!!activeType}
          onClose={() => setActiveType(null)}
        />
      )}
    </Card>
  );
}

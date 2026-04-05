"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
import { 
  Share2, 
  Globe, 
  MessageSquare, 
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { trackVehicleShareAction } from "@/actions/inventory";

interface DistributionPanelProps {
  vehicle: SerializedVehicleWithMedia;
}

export function DistributionPanel({ vehicle }: DistributionPanelProps) {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const isPublished = vehicle.vehicleStatus === "LISTED";

  const copyListingLink = async () => {
    if (!isPublished) return;
    const url = `${window.location.origin}/${vehicle.organization.slug}/inventory/${vehicle.slug ?? vehicle.id}`;
    await navigator.clipboard.writeText(url);
    await trackVehicleShareAction(vehicle.id, vehicle.organizationId);
    setCopiedLink(true);
    toast.success("Link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openSmsShare = async () => {
    if (!isPublished) return;
    const url = `${window.location.origin}/${vehicle.organization.slug}/inventory/${vehicle.slug ?? vehicle.id}`;
    const text = `Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model}: ${url}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`);
    await trackVehicleShareAction(vehicle.id, vehicle.organizationId);
  };

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 uppercase tracking-tighter font-black">
          <Share2 className="h-5 w-5 text-primary" />
          Share & Distribution
        </CardTitle>
        <CardDescription className="font-medium">
          Public links and mobile sharing for published vehicles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isPublished ? (
          <div className="p-4 rounded-lg bg-muted border flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Public sharing is disabled until this vehicle is published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Dealer Website */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Public Link</label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 font-bold h-10" onClick={copyListingLink}>
                  {copiedLink ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedLink ? "Copied" : "Copy Link"}
                </Button>
                <Button variant="outline" className="px-3 h-10" asChild title="Open Public Page">
                  <a href={`/${vehicle.organization.slug}/inventory/${vehicle.slug ?? vehicle.id}`} target="_blank">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* SMS Share Link */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Mobile Share</label>
              <Button variant="secondary" className="font-bold h-10" onClick={openSmsShare}>
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS Share Link
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

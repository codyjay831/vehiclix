"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VehicleWithMedia } from "@/types";
import { toast } from "sonner";
import { Copy, Facebook, Mail, FileText, Share2 } from "lucide-react";
import { trackVehicleShareAction } from "@/actions/inventory";

export type GeneratorType = "FACEBOOK" | "CRAIGSLIST" | "EMAIL";

interface ListingGeneratorModalProps {
  vehicle: VehicleWithMedia | null;
  type: GeneratorType;
  isOpen: boolean;
  onClose: () => void;
}

export function ListingGeneratorModal({ vehicle, type, isOpen, onClose }: ListingGeneratorModalProps) {
  const [content, setContent] = React.useState({ title: "", body: "" });

  React.useEffect(() => {
    if (vehicle) {
      const url = `${window.location.origin}/${vehicle.organization.slug}/inventory/${vehicle.id}`;
      const highlights = (vehicle.highlights || [])
        .map((h) => `• ${h}`)
        .join("\n");
      const price = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(vehicle.price));

      if (type === "FACEBOOK") {
        setContent({
          title: "Facebook Listing Generator",
          body: `⚡ ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""}

${vehicle.titleStatus === "CLEAN" ? "Clean title" : vehicle.titleStatus}
${vehicle.mileage.toLocaleString()} miles
${vehicle.condition} condition

Highlights
${highlights}

Price: ${price}

📍 ${vehicle.organization.name}
☎ ${vehicle.organization.phone || "(Dealer Phone)"}

View full listing:
${url}`,
        });
      } else if (type === "CRAIGSLIST") {
        setContent({
          title: "Craigslist Listing Generator",
          body: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""} - ${price}

${vehicle.description || ""}

Highlights:
${highlights}

Condition: ${vehicle.condition}
Title: ${vehicle.titleStatus}
Mileage: ${vehicle.mileage.toLocaleString()}

Contact: ${vehicle.organization.name}
Phone: ${vehicle.organization.phone || "(Dealer Phone)"}

See more photos and details:
${url}`,
        });
      } else if (type === "EMAIL") {
        setContent({
          title: "Email Listing Template",
          body: `Subject: ${vehicle.year} ${vehicle.make} ${vehicle.model} — Available Now

Hi,

Check out this ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""} we just listed for ${price}.

${vehicle.description || ""}

Key Highlights:
${highlights}

Mileage: ${vehicle.mileage.toLocaleString()} miles
Condition: ${vehicle.condition}

You can view the full listing and more photos here:
${url}

Best,
${vehicle.organization.name}`,
        });
      }
    }
  }, [vehicle, type]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content.body);
      toast.success("Copied to clipboard");
      if (vehicle) {
        await trackVehicleShareAction(vehicle.id, vehicle.organizationId);
      }
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  if (!vehicle) return null;

  const getIcon = () => {
    switch (type) {
      case "FACEBOOK": return <Facebook className="h-5 w-5 text-[#1877F2]" />;
      case "CRAIGSLIST": return <FileText className="h-5 w-5 text-purple-600" />;
      case "EMAIL": return <Mail className="h-5 w-5 text-red-500" />;
      default: return <Share2 className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {content.title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {type === "EMAIL" 
              ? "Copy this template to use in your email client."
              : `Copy and paste this text into ${type === "FACEBOOK" ? "Facebook" : "Craigslist"}.`}
          </p>
          <Textarea
            value={content.body}
            readOnly
            className="min-h-[350px] font-sans text-sm leading-relaxed"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={copyToClipboard} className={type === "FACEBOOK" ? "bg-[#1877F2] hover:bg-[#166fe5]" : ""}>
            <Copy className="mr-2 h-4 w-4" />
            Copy {type === "EMAIL" ? "Template" : "Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

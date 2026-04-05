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
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
import { toast } from "sonner";
import { Copy, Facebook, Mail, FileText, Share2, Save, RotateCcw, Loader2, Type, AlignLeft } from "lucide-react";
import { trackVehicleShareAction, saveVehicleListingDraftAction } from "@/actions/inventory";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type GeneratorType = "FACEBOOK" | "CRAIGSLIST" | "EMAIL" | "GENERIC";

interface ListingGeneratorModalProps {
  vehicle: SerializedVehicleWithMedia | null;
  type: GeneratorType;
  isOpen: boolean;
  onClose: () => void;
}

export function ListingGeneratorModal({ vehicle, type, isOpen, onClose }: ListingGeneratorModalProps) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [tone, setTone] = React.useState("Professional");
  const [length, setLength] = React.useState("Medium");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const getTitle = () => {
    switch (type) {
      case "FACEBOOK": return "Facebook Template";
      case "CRAIGSLIST": return "Craigslist Template";
      case "EMAIL": return "Email Template";
      case "GENERIC": return "Generic Listing Template";
      default: return "Listing Template";
    }
  };

  const generateDefaultContent = React.useCallback(() => {
    if (!vehicle) return { title: "", body: "" };
    const url = `${window.location.origin}/${vehicle.organization.slug}/inventory/${vehicle.slug ?? vehicle.id}`;
    const highlights = (vehicle.highlights || [])
      .map((h) => `• ${h}`)
      .join("\n");
    const price =
      vehicle.price !== null
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(Number(vehicle.price))
        : "Price on request";

    if (type === "FACEBOOK") {
      return {
        title: `⚡ ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
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
      };
    } else if (type === "CRAIGSLIST") {
      return {
        title: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""} - ${price}`,
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
      };
    } else if (type === "EMAIL") {
      return {
        title: `${vehicle.year} ${vehicle.make} ${vehicle.model} — Available Now`,
        body: `Hi,

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
      };
    } else if (type === "GENERIC") {
      return {
        title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        body: `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""}

Price: ${price}
Mileage: ${vehicle.mileage.toLocaleString()} miles
Title: ${vehicle.titleStatus}

Description:
${vehicle.description || ""}

Highlights:
${highlights}

View more: ${url}`,
      };
    }
    return { title: "", body: "" };
  }, [vehicle, type]);

  React.useEffect(() => {
    if (isOpen && vehicle && !isInitialized) {
      // Find existing draft
      const existingDraft = vehicle.listingDrafts?.find((d) => d.channel === type);
      if (existingDraft) {
        setTitle(existingDraft.title || "");
        setBody(existingDraft.body || "");
        setTone(existingDraft.tone || "Professional");
        setLength(existingDraft.length || "Medium");
      } else {
        const defaults = generateDefaultContent();
        setTitle(defaults.title);
        setBody(defaults.body);
      }
      setIsInitialized(true);
    }
  }, [isOpen, vehicle, type, isInitialized, generateDefaultContent]);

  // Reset initialization when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!vehicle) return;
    setIsSaving(true);
    try {
      await saveVehicleListingDraftAction(vehicle.id, type, {
        title,
        body,
        tone,
        length,
      });
      toast.success("Draft saved");
    } catch (err) {
      toast.error("Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const defaults = generateDefaultContent();
    setTitle(defaults.title);
    setBody(defaults.body);
    setTone("Professional");
    setLength("Medium");
    toast.info("Reset to default template");
  };

  const copyToClipboard = async () => {
    try {
      const fullText = title ? `${title}\n\n${body}` : body;
      await navigator.clipboard.writeText(fullText);
      toast.success("Copied to clipboard");
      if (vehicle) {
        await trackVehicleShareAction(vehicle.id, vehicle.organizationId);
        // Also auto-save on copy to ensure persistence
        await saveVehicleListingDraftAction(vehicle.id, type, {
          title,
          body,
          tone,
          length,
        });
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
      case "GENERIC": return <Type className="h-5 w-5 text-gray-600" />;
      default: return <Share2 className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">
              {getIcon()}
              {getTitle()}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset} 
              className="h-8 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tone</label>
              <Select value={tone} onValueChange={(val) => setTone(val || "Professional")}>
                <SelectTrigger className="h-9 border-2">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Aggressive">Urgent/Salesy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Length</label>
              <Select value={length} onValueChange={(val) => setLength(val || "Medium")}>
                <SelectTrigger className="h-9 border-2">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Short">Short</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Type className="h-3 w-3" /> Listing Title
            </label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="border-2 font-bold"
              placeholder="Enter listing title..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <AlignLeft className="h-3 w-3" /> Listing Body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[300px] font-sans text-sm leading-relaxed focus-visible:ring-primary/20 bg-muted/5 border-2"
              placeholder="Type your listing copy here..."
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full border-t pt-4 mt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={handleSave} 
              disabled={isSaving} 
              className="font-bold flex-1 sm:flex-none border-2"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" onClick={onClose} className="font-bold flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button 
              onClick={copyToClipboard} 
              className={type === "FACEBOOK" ? "bg-[#1877F2] hover:bg-[#166fe5] font-black flex-1 sm:flex-none px-6" : "font-black flex-1 sm:flex-none px-6"}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

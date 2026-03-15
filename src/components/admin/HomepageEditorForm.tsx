"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateHomepageAction, type HomepageEditorPayload } from "@/actions/homepage";
import { OrganizationHomepage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  Megaphone, 
  Globe, 
  ShieldCheck, 
  Star, 
  FileText, 
  Phone,
  Trash2, 
  Plus,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HomepageEditorFormProps {
  initialData: OrganizationHomepage | null;
}

interface TrustHighlight {
  icon: string;
  title: string;
  description: string;
}

export function HomepageEditorForm({ initialData }: HomepageEditorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize visibility toggles
  const [showPromo, setShowPromo] = useState(initialData?.showPromo ?? false);
  const [showFeaturedInventory, setShowFeaturedInventory] = useState(initialData?.showFeaturedInventory ?? true);
  const [showTestimonial, setShowTestimonial] = useState(initialData?.showTestimonial ?? false);
  const [showAboutTeaser, setShowAboutTeaser] = useState(initialData?.showAboutTeaser ?? true);
  const [showContactCta, setShowContactCta] = useState(initialData?.showContactCta ?? true);
  const [showTrustHighlights, setShowTrustHighlights] = useState(initialData?.showTrustHighlights ?? true);

  // Trust highlights state (3-4 items)
  const defaultHighlights: TrustHighlight[] = [
    { icon: "ShieldCheck", title: "Curated Selection", description: "Every vehicle is thoroughly inspected." },
    { icon: "Zap", title: "Verified Battery Health", description: "Detailed range and health reports." },
    { icon: "ShieldCheck", title: "Transparent Pricing", description: "No hidden fees, ever." },
  ];

  const [trustHighlights, setTrustHighlights] = useState<TrustHighlight[]>(
    (initialData?.trustHighlightsJson as unknown as TrustHighlight[]) || defaultHighlights
  );

  const [ctaRoute, setCtaRoute] = useState<string>(initialData?.heroPrimaryCtaRoute || "inventory");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const data: HomepageEditorPayload = {
      showPromo,
      promoText: formData.get("promoText") as string,
      heroHeadline: formData.get("heroHeadline") as string,
      heroSubheadline: formData.get("heroSubheadline") as string,
      heroPrimaryCtaLabel: formData.get("heroPrimaryCtaLabel") as string,
      heroPrimaryCtaRoute: ctaRoute as any,
      trustHighlightsJson: showTrustHighlights ? trustHighlights : undefined,
      showFeaturedInventory,
      showTestimonial,
      testimonialQuote: formData.get("testimonialQuote") as string,
      testimonialAuthor: formData.get("testimonialAuthor") as string,
      showAboutTeaser,
      aboutTeaser: formData.get("aboutTeaser") as string,
      showContactCta,
      contactCtaHeadline: formData.get("contactCtaHeadline") as string,
      contactCtaBody: formData.get("contactCtaBody") as string,
    };

    try {
      const result = await updateHomepageAction(data);
      if (result.success) {
        toast({
          title: "Homepage updated",
          description: "Your dealership landing page has been updated.",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: result.error || "An unknown error occurred",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while saving homepage content.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const updateHighlight = (index: number, field: keyof TrustHighlight, value: string) => {
    const newHighlights = [...trustHighlights];
    newHighlights[index] = { ...newHighlights[index], [field]: value };
    setTrustHighlights(newHighlights);
  };

  const addHighlight = () => {
    if (trustHighlights.length < 4) {
      setTrustHighlights([...trustHighlights, { icon: "ShieldCheck", title: "", description: "" }]);
    }
  };

  const removeHighlight = (index: number) => {
    if (trustHighlights.length > 3) {
      const newHighlights = trustHighlights.filter((_, i) => i !== index);
      setTrustHighlights(newHighlights);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Announcement/Promo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Announcement Bar
            </CardTitle>
            <CardDescription>Show a promotional message at the top of every page.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="showPromo" className="text-xs uppercase font-black italic tracking-widest">Active</Label>
            <Checkbox 
              id="showPromo" 
              checked={showPromo} 
              onCheckedChange={(checked) => setShowPromo(checked === true)}
            />
          </div>
        </CardHeader>
        {showPromo && (
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="promoText">Promo Text</Label>
              <Input
                id="promoText"
                name="promoText"
                placeholder="Free delivery on all inventory through the end of the month!"
                defaultValue={initialData?.promoText || ""}
                maxLength={100}
              />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Max 100 characters.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Hero Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Hero Section Overrides
          </CardTitle>
          <CardDescription>Override the standard branding hero content for the homepage specifically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="heroHeadline">Hero Headline</Label>
              <Input
                id="heroHeadline"
                name="heroHeadline"
                placeholder="Experience Electric Excellence"
                defaultValue={initialData?.heroHeadline || ""}
                maxLength={80}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="heroSubheadline">Hero Subheadline</Label>
              <Textarea
                id="heroSubheadline"
                name="heroSubheadline"
                placeholder="The future of mobility is here."
                defaultValue={initialData?.heroSubheadline || ""}
                maxLength={160}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="heroPrimaryCtaLabel">CTA Button Label</Label>
              <Input
                id="heroPrimaryCtaLabel"
                name="heroPrimaryCtaLabel"
                placeholder="Browse Showroom"
                defaultValue={initialData?.heroPrimaryCtaLabel || ""}
                maxLength={30}
              />
            </div>
            <div className="grid gap-2">
              <Label>CTA Destination</Label>
              <Select value={ctaRoute} onValueChange={(val) => setCtaRoute(val || "inventory")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="request-vehicle">Request Vehicle</SelectItem>
                  <SelectItem value="register">Register</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Highlights */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Trust Highlights
            </CardTitle>
            <CardDescription>Key value propositions for your dealership.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="showTrustHighlights" className="text-xs uppercase font-black italic tracking-widest">Visible</Label>
            <Checkbox 
              id="showTrustHighlights" 
              checked={showTrustHighlights} 
              onCheckedChange={(checked) => setShowTrustHighlights(checked === true)}
            />
          </div>
        </CardHeader>
        {showTrustHighlights && (
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {trustHighlights.map((highlight, index) => (
                <div key={index} className="grid gap-4 p-4 border rounded-lg bg-muted/10 relative group">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Icon</Label>
                      <Select 
                        value={highlight.icon} 
                        onValueChange={(val) => updateHighlight(index, "icon", val || "ShieldCheck")}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ShieldCheck">Shield</SelectItem>
                          <SelectItem value="Zap">Zap / Energy</SelectItem>
                          <SelectItem value="Star">Star</SelectItem>
                          <SelectItem value="Phone">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Title</Label>
                      <Input 
                        value={highlight.title} 
                        onChange={(e) => updateHighlight(index, "title", e.target.value)}
                        placeholder="e.g. Curated Selection"
                        className="h-9"
                        maxLength={40}
                      />
                    </div>
                    <div className="md:col-span-5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={highlight.description} 
                          onChange={(e) => updateHighlight(index, "description", e.target.value)}
                          placeholder="e.g. Every vehicle inspected."
                          className="h-9"
                          maxLength={100}
                        />
                        {trustHighlights.length > 3 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeHighlight(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {trustHighlights.length < 4 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-fit gap-2 font-bold uppercase tracking-widest text-[10px] italic h-8"
                  onClick={addHighlight}
                >
                  <Plus className="h-3 w-3" /> Add Highlight
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Featured Inventory Toggle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Featured Inventory
            </CardTitle>
            <CardDescription>Showcase your top-performing vehicles on the homepage.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="showFeaturedInventory" className="text-xs uppercase font-black italic tracking-widest">Active</Label>
            <Checkbox 
              id="showFeaturedInventory" 
              checked={showFeaturedInventory} 
              onCheckedChange={(checked) => setShowFeaturedInventory(checked === true)}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Testimonial */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Customer Testimonial
            </CardTitle>
            <CardDescription>Feature a quote from a happy customer.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="showTestimonial" className="text-xs uppercase font-black italic tracking-widest">Visible</Label>
            <Checkbox 
              id="showTestimonial" 
              checked={showTestimonial} 
              onCheckedChange={(checked) => setShowTestimonial(checked === true)}
            />
          </div>
        </CardHeader>
        {showTestimonial && (
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="testimonialQuote">Quote</Label>
              <Textarea
                id="testimonialQuote"
                name="testimonialQuote"
                placeholder="The team at Vehiclix made buying an EV seamless..."
                defaultValue={initialData?.testimonialQuote || ""}
                maxLength={300}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="testimonialAuthor">Author / Customer Name</Label>
              <Input
                id="testimonialAuthor"
                name="testimonialAuthor"
                placeholder="John Doe"
                defaultValue={initialData?.testimonialAuthor || ""}
                maxLength={100}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* About Teaser */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              About Teaser
            </CardTitle>
            <CardDescription>A brief summary of your dealership mission on the homepage.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="showAboutTeaser" className="text-xs uppercase font-black italic tracking-widest">Visible</Label>
            <Checkbox 
              id="showAboutTeaser" 
              checked={showAboutTeaser} 
              onCheckedChange={(checked) => setShowAboutTeaser(checked === true)}
            />
          </div>
        </CardHeader>
        {showAboutTeaser && (
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="aboutTeaser">Teaser Text</Label>
              <Textarea
                id="aboutTeaser"
                name="aboutTeaser"
                placeholder="We specialize in premium electric vehicles..."
                defaultValue={initialData?.aboutTeaser || ""}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Contact CTA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Contact CTA Section
            </CardTitle>
            <CardDescription>A strong call-to-action block at the bottom of the page.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="showContactCta" className="text-xs uppercase font-black italic tracking-widest">Visible</Label>
            <Checkbox 
              id="showContactCta" 
              checked={showContactCta} 
              onCheckedChange={(checked) => setShowContactCta(checked === true)}
            />
          </div>
        </CardHeader>
        {showContactCta && (
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="contactCtaHeadline">Headline</Label>
              <Input
                id="contactCtaHeadline"
                name="contactCtaHeadline"
                placeholder="Ready to drive?"
                defaultValue={initialData?.contactCtaHeadline || ""}
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactCtaBody">Subtext / Body</Label>
              <Textarea
                id="contactCtaBody"
                name="contactCtaBody"
                placeholder="Contact us to schedule a test drive..."
                defaultValue={initialData?.contactCtaBody || ""}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4 pb-12">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

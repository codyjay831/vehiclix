"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationBrandingAction } from "@/actions/organization";
import { updateHomepageAction, type HomepageEditorPayload } from "@/actions/homepage";
import { OrganizationBranding, OrganizationHomepage, PublicSiteMode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Zap,
  Image as ImageIcon,
  Mail,
  MapPin,
  Store,
  ExternalLink,
  Info,
  LayoutDashboard,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StorefrontEditorFormProps {
  branding: OrganizationBranding | null;
  homepage: OrganizationHomepage | null;
  storefrontUrl: string | null;
}

interface TrustHighlight {
  icon: string;
  title: string;
  description: string;
}

export function StorefrontEditorForm({ branding, homepage, storefrontUrl }: StorefrontEditorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Public Site Mode ---
  const [siteMode, setSiteMode] = useState<PublicSiteMode>(branding?.publicSiteMode || PublicSiteMode.FULL_STOREFRONT);

  // --- Homepage section toggles ---
  const [showPromo, setShowPromo] = useState(homepage?.showPromo ?? false);
  const [showFeaturedInventory, setShowFeaturedInventory] = useState(homepage?.showFeaturedInventory ?? true);
  const [showTestimonial, setShowTestimonial] = useState(homepage?.showTestimonial ?? false);
  const [showAboutTeaser, setShowAboutTeaser] = useState(homepage?.showAboutTeaser ?? true);
  const [showContactCta, setShowContactCta] = useState(homepage?.showContactCta ?? true);
  const [showTrustHighlights, setShowTrustHighlights] = useState(homepage?.showTrustHighlights ?? true);

  // --- Trust highlights state ---
  const defaultHighlights: TrustHighlight[] = [
    { icon: "ShieldCheck", title: "Quality Inspected", description: "Every vehicle is thoroughly reviewed." },
    { icon: "Zap", title: "Transparent Details", description: "Full specs and vehicle history available." },
    { icon: "ShieldCheck", title: "No Hidden Fees", description: "Honest, upfront pricing." },
  ];

  const [trustHighlights, setTrustHighlights] = useState<TrustHighlight[]>(
    (homepage?.trustHighlightsJson as unknown as TrustHighlight[]) || defaultHighlights
  );

  // --- CTA route ---
  const [ctaRoute, setCtaRoute] = useState<string>(homepage?.heroPrimaryCtaRoute || "inventory");

  // --- Hero initial values ---
  const initialHeroHeadline = homepage?.heroHeadline || branding?.heroHeadline || "";
  const initialHeroSubheadline = homepage?.heroSubheadline || branding?.heroSubheadline || "";

  // --- Helpers ---
  const updateHighlight = (index: number, field: keyof TrustHighlight, value: string) => {
    const next = [...trustHighlights];
    next[index] = { ...next[index], [field]: value };
    setTrustHighlights(next);
  };

  const addHighlight = () => {
    if (trustHighlights.length < 4) {
      setTrustHighlights([...trustHighlights, { icon: "ShieldCheck", title: "", description: "" }]);
    }
  };

  const removeHighlight = (index: number) => {
    if (trustHighlights.length > 3) {
      setTrustHighlights(trustHighlights.filter((_, i) => i !== index));
    }
  };

  // --- Submit ---
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);

      const brandingData = {
        publicSiteMode: siteMode,
        logoUrl: formData.get("logoUrl") as string || branding?.logoUrl || "",
        heroHeadline: formData.get("heroHeadline") as string || branding?.heroHeadline || "",
        heroSubheadline: formData.get("heroSubheadline") as string || branding?.heroSubheadline || "",
        aboutBlurb: formData.get("aboutBlurb") as string || branding?.aboutBlurb || "",
        contactEmail: formData.get("contactEmail") as string || branding?.contactEmail || "",
        contactPhone: formData.get("contactPhone") as string || branding?.contactPhone || "",
        address: formData.get("address") as string || branding?.address || "",
        socialImageUrl: formData.get("socialImageUrl") as string || branding?.socialImageUrl || "",
      };

      // Only save homepage data if not in DISABLED mode
      let homepageResult: { success: boolean; error: string | null } = { success: true, error: null };
      if (siteMode !== PublicSiteMode.DISABLED) {
        const homepageData: HomepageEditorPayload = {
          showPromo,
          promoText: (formData.get("promoText") as string) || homepage?.promoText || "",
          heroHeadline: (formData.get("heroHeadline") as string) || homepage?.heroHeadline || "",
          heroSubheadline: (formData.get("heroSubheadline") as string) || homepage?.heroSubheadline || "",
          heroPrimaryCtaLabel: (formData.get("heroPrimaryCtaLabel") as string) || homepage?.heroPrimaryCtaLabel || "",
          heroPrimaryCtaRoute: ctaRoute as HomepageEditorPayload["heroPrimaryCtaRoute"],
          trustHighlightsJson: showTrustHighlights ? trustHighlights : undefined,
          showFeaturedInventory,
          showTestimonial,
          testimonialQuote: (formData.get("testimonialQuote") as string) || homepage?.testimonialQuote || "",
          testimonialAuthor: (formData.get("testimonialAuthor") as string) || homepage?.testimonialAuthor || "",
          showAboutTeaser,
          aboutTeaser: (formData.get("aboutTeaser") as string) || homepage?.aboutTeaser || "",
          showContactCta,
          contactCtaHeadline: (formData.get("contactCtaHeadline") as string) || homepage?.contactCtaHeadline || "",
          contactCtaBody: (formData.get("contactCtaBody") as string) || homepage?.contactCtaBody || "",
        };
        const res = await updateHomepageAction(homepageData);
        homepageResult = { success: res.success, error: res.error || null };
      }

      const brandingResult = await updateOrganizationBrandingAction(brandingData);

      if (brandingResult.success && homepageResult.success) {
        toast({ title: "Settings updated", description: "Public site configuration has been saved." });
        router.refresh();
      } else {
        const errors = [
          !brandingResult.success && `Brand: ${brandingResult.error}`,
          !homepageResult.success && `Homepage: ${homepageResult.error}`,
        ].filter(Boolean).join(" · ");
        toast({ variant: "destructive", title: "Update failed", description: errors || "An unknown error occurred" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong while saving settings." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-4xl">
      {/* ============================================================ */}
      {/* PUBLIC SITE MODE                                             */}
      {/* ============================================================ */}
      <Card className={cn(siteMode === PublicSiteMode.DISABLED && "border-dashed border-destructive/40")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Public Site Mode
          </CardTitle>
          <CardDescription>
            Choose how your dealership appears to the public.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup 
            value={siteMode} 
            onValueChange={(val) => setSiteMode(val as PublicSiteMode)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <ModeOption 
              value={PublicSiteMode.FULL_STOREFRONT}
              title="Full Storefront"
              description="Branded homepage with all marketing sections enabled."
              icon={Store}
            />
            <ModeOption 
              value={PublicSiteMode.INVENTORY_ONLY}
              title="Inventory Only"
              description="Directly show your showroom. Homepage is disabled."
              icon={LayoutDashboard}
            />
            <ModeOption 
              value={PublicSiteMode.DISABLED}
              title="Fully Disabled"
              description="Public access is blocked. visitors will see a 404."
              icon={EyeOff}
              variant="destructive"
            />
          </RadioGroup>

          <div className={cn(
            "flex items-start gap-3 text-sm rounded-lg p-4 border",
            siteMode === PublicSiteMode.FULL_STOREFRONT && "bg-muted/50 text-muted-foreground border-border",
            siteMode === PublicSiteMode.INVENTORY_ONLY && "bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/40",
            siteMode === PublicSiteMode.DISABLED && "bg-destructive/5 text-destructive border-destructive/20"
          )}>
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">
                {siteMode === PublicSiteMode.FULL_STOREFRONT && "Visitors see your full branded homepage."}
                {siteMode === PublicSiteMode.INVENTORY_ONLY && "Visitors are redirected to your inventory showroom."}
                {siteMode === PublicSiteMode.DISABLED && "The public site is inaccessible."}
              </p>
              <p className={cn(
                "text-xs opacity-80",
                siteMode === PublicSiteMode.FULL_STOREFRONT && "text-muted-foreground",
                siteMode === PublicSiteMode.INVENTORY_ONLY && "text-amber-800 dark:text-amber-300",
                siteMode === PublicSiteMode.DISABLED && "text-destructive"
              )}>
                {siteMode === PublicSiteMode.FULL_STOREFRONT && "All configured sections, marketing pages, and inventory will be visible."}
                {siteMode === PublicSiteMode.INVENTORY_ONLY && "Marketing-only pages (About, Contact, Find My EV) are also hidden to focus entirely on inventory."}
                {siteMode === PublicSiteMode.DISABLED && "Anyone attempting to visit your dealership URL will receive a 404 error. Internal admin access remains active."}
              </p>
              {siteMode !== PublicSiteMode.DISABLED && storefrontUrl && (
                <Link href={storefrontUrl} target="_blank" className="inline-flex items-center gap-1 mt-2 text-primary font-bold hover:underline">
                  View Public Site <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {siteMode !== PublicSiteMode.DISABLED && (
        <>
          {/* ============================================================ */}
          {/* BRAND IDENTITY                                               */}
          {/* ============================================================ */}
          <SectionDivider label="Brand Identity" />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Logo &amp; Sharing
              </CardTitle>
              <CardDescription>
                Your logo and social preview image appear across your public site.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  placeholder="https://example.com/logo.png"
                  defaultValue={branding?.logoUrl || ""}
                />
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Recommended: transparent PNG, ~40px height
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="socialImageUrl">Social Share Image (OG)</Label>
                <Input
                  id="socialImageUrl"
                  name="socialImageUrl"
                  placeholder="https://example.com/social-preview.jpg"
                  defaultValue={branding?.socialImageUrl || ""}
                />
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Displayed when your dealership link is shared on social media.
                </p>
              </div>
            </CardContent>
          </Card>

          {siteMode === PublicSiteMode.FULL_STOREFRONT && (
            <>
              {/* ============================================================ */}
              {/* HERO SECTION                                                 */}
              {/* ============================================================ */}
              <SectionDivider label="Hero Section" />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Hero
                  </CardTitle>
                  <CardDescription>
                    The first thing visitors see when they land on your homepage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="heroHeadline">Headline</Label>
                      <Input
                        id="heroHeadline"
                        name="heroHeadline"
                        placeholder="Welcome to Our Dealership"
                        defaultValue={initialHeroHeadline}
                        maxLength={80}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="heroSubheadline">Subheadline</Label>
                      <Textarea
                        id="heroSubheadline"
                        name="heroSubheadline"
                        placeholder="Browse our inventory and find your next vehicle."
                        defaultValue={initialHeroSubheadline}
                        maxLength={160}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="heroPrimaryCtaLabel">Button Label</Label>
                      <Input
                        id="heroPrimaryCtaLabel"
                        name="heroPrimaryCtaLabel"
                        placeholder="View Inventory"
                        defaultValue={homepage?.heroPrimaryCtaLabel || ""}
                        maxLength={30}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Button Destination</Label>
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

              {/* ============================================================ */}
              {/* HOMEPAGE SECTIONS                                            */}
              {/* ============================================================ */}
              <SectionDivider label="Homepage Sections" />
              <p className="text-sm text-muted-foreground -mt-4">
                Toggle individual sections on or off to control what appears on your homepage.
              </p>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      Announcement Bar
                    </CardTitle>
                    <CardDescription>Display a short message at the top of every page.</CardDescription>
                  </div>
                  <VisibilityToggle id="showPromo" checked={showPromo} onChange={setShowPromo} />
                </CardHeader>
                {showPromo && (
                  <CardContent>
                    <div className="grid gap-2">
                      <Label htmlFor="promoText">Message</Label>
                      <Input
                        id="promoText"
                        name="promoText"
                        placeholder="Free delivery on all vehicles this month!"
                        defaultValue={homepage?.promoText || ""}
                        maxLength={100}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Value Propositions
                    </CardTitle>
                    <CardDescription>Highlight what sets your dealership apart.</CardDescription>
                  </div>
                  <VisibilityToggle id="showTrustHighlights" checked={showTrustHighlights} onChange={setShowTrustHighlights} />
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
                                  <SelectItem value="Zap">Energy</SelectItem>
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
                                placeholder="e.g. Quality Inspected"
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
                                  placeholder="e.g. Every vehicle is reviewed."
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
                          <Plus className="h-3 w-3" /> Add Item
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Featured Inventory
                    </CardTitle>
                    <CardDescription>Automatically showcase latest listed vehicles on the homepage.</CardDescription>
                  </div>
                  <VisibilityToggle id="showFeaturedInventory" checked={showFeaturedInventory} onChange={setShowFeaturedInventory} />
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Customer Testimonial
                    </CardTitle>
                    <CardDescription>Feature a quote from a satisfied customer.</CardDescription>
                  </div>
                  <VisibilityToggle id="showTestimonial" checked={showTestimonial} onChange={setShowTestimonial} />
                </CardHeader>
                {showTestimonial && (
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="testimonialQuote">Quote</Label>
                      <Textarea
                        id="testimonialQuote"
                        name="testimonialQuote"
                        placeholder="We had a great experience..."
                        defaultValue={homepage?.testimonialQuote || ""}
                        maxLength={300}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="testimonialAuthor">Customer Name</Label>
                      <Input
                        id="testimonialAuthor"
                        name="testimonialAuthor"
                        placeholder="Jane Smith"
                        defaultValue={homepage?.testimonialAuthor || ""}
                        maxLength={100}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      About Preview
                    </CardTitle>
                    <CardDescription>A brief summary of your business shown on the homepage.</CardDescription>
                  </div>
                  <VisibilityToggle id="showAboutTeaser" checked={showAboutTeaser} onChange={setShowAboutTeaser} />
                </CardHeader>
                {showAboutTeaser && (
                  <CardContent>
                    <div className="grid gap-2">
                      <Label htmlFor="aboutTeaser">Preview Text</Label>
                      <Textarea
                        id="aboutTeaser"
                        name="aboutTeaser"
                        placeholder="Tell visitors what your dealership is about..."
                        defaultValue={homepage?.aboutTeaser || ""}
                        className="min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      Contact Call-to-Action
                    </CardTitle>
                    <CardDescription>A call-to-action block at the bottom of the homepage.</CardDescription>
                  </div>
                  <VisibilityToggle id="showContactCta" checked={showContactCta} onChange={setShowContactCta} />
                </CardHeader>
                {showContactCta && (
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contactCtaHeadline">Headline</Label>
                      <Input
                        id="contactCtaHeadline"
                        name="contactCtaHeadline"
                        placeholder="Ready to get started?"
                        defaultValue={homepage?.contactCtaHeadline || ""}
                        maxLength={100}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contactCtaBody">Body Text</Label>
                      <Textarea
                        id="contactCtaBody"
                        name="contactCtaBody"
                        placeholder="Get in touch to schedule a visit..."
                        defaultValue={homepage?.contactCtaBody || ""}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              <SectionDivider label="About Your Business" />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Business Description
                  </CardTitle>
                  <CardDescription>
                    Displayed on your full About page.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    <Label htmlFor="aboutBlurb">About</Label>
                    <Textarea
                      id="aboutBlurb"
                      name="aboutBlurb"
                      placeholder="Tell visitors what makes your dealership unique..."
                      className="min-h-[150px]"
                      defaultValue={branding?.aboutBlurb || ""}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ============================================================ */}
          {/* CONTACT INFORMATION                                          */}
          {/* ============================================================ */}
          <SectionDivider label="Contact Information" />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Public Contact Details
              </CardTitle>
              <CardDescription>
                {siteMode === PublicSiteMode.FULL_STOREFRONT 
                  ? "Shown in the footer and on your Contact page across the site."
                  : "Shown in the site footer."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="contactEmail" className="flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="sales@yourdealership.com"
                  defaultValue={branding?.contactEmail || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-2">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  placeholder="(555) 123-4567"
                  defaultValue={branding?.contactPhone || ""}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Address
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  placeholder="123 Main Street, City, State 00000"
                  className="min-h-[80px]"
                  defaultValue={branding?.address || ""}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* SAVE BAR                                                     */}
      {/* ============================================================ */}
      <div className="flex justify-end gap-4 pb-12">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[180px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* HELPER COMPONENTS                                                   */
/* ------------------------------------------------------------------ */

function ModeOption({ 
  value, 
  title, 
  description, 
  icon: Icon,
  variant = "default"
}: { 
  value: string; 
  title: string; 
  description: string;
  icon: any;
  variant?: "default" | "destructive";
}) {
  return (
    <Label
      className={cn(
        "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-all cursor-pointer text-center",
        variant === "destructive" && "peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive"
      )}
    >
      <RadioGroupItem value={value} className="sr-only" />
      <Icon className={cn(
        "h-6 w-6 mb-3",
        variant === "destructive" ? "text-destructive" : "text-primary"
      )} />
      <span className="font-black uppercase tracking-tight text-xs mb-1">{title}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{description}</span>
    </Label>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 pt-2">
      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">{label}</h3>
      <div className="h-px bg-border flex-1" />
    </div>
  );
}

function VisibilityToggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-xs uppercase font-black italic tracking-widest">
        {checked ? "Visible" : "Hidden"}
      </Label>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
    </div>
  );
}

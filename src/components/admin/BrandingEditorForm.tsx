"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationBrandingAction } from "@/actions/organization";
import { OrganizationBranding } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Phone, Mail, MapPin, Image as ImageIcon } from "lucide-react";

interface BrandingEditorFormProps {
  initialData: OrganizationBranding | null;
}

export function BrandingEditorForm({ initialData }: BrandingEditorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const data = {
      logoUrl: formData.get("logoUrl") as string,
      heroHeadline: formData.get("heroHeadline") as string,
      heroSubheadline: formData.get("heroSubheadline") as string,
      aboutBlurb: formData.get("aboutBlurb") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      address: formData.get("address") as string,
      socialImageUrl: formData.get("socialImageUrl") as string,
    };

    try {
      const result = await updateOrganizationBrandingAction(data);
      if (result.success) {
        toast({
          title: "Branding updated",
          description: "Your dealership website branding has been saved.",
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
        description: "Something went wrong while saving branding.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Visual Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Visual Identity
          </CardTitle>
          <CardDescription>
            Customize how your dealership looks to the public.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              placeholder="https://example.com/logo.png"
              defaultValue={initialData?.logoUrl || ""}
            />
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Recommended: transparent PNG, ~40px height
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="socialImageUrl">Social Share Image (OG) URL</Label>
            <Input
              id="socialImageUrl"
              name="socialImageUrl"
              placeholder="https://example.com/social-preview.jpg"
              defaultValue={initialData?.socialImageUrl || ""}
            />
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Used when your website link is shared on social media.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hero Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Homepage Hero
          </CardTitle>
          <CardDescription>
            The first thing visitors see on your homepage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="heroHeadline">Hero Headline</Label>
            <Input
              id="heroHeadline"
              name="heroHeadline"
              placeholder="Experience Electric Excellence"
              defaultValue={initialData?.heroHeadline || ""}
            />
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Keep it short and punchy.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="heroSubheadline">Hero Subheadline</Label>
            <Textarea
              id="heroSubheadline"
              name="heroSubheadline"
              placeholder="A highly-curated showroom of high-performance electric vehicles..."
              className="min-h-[100px]"
              defaultValue={initialData?.heroSubheadline || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* About Us */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            About Our Mission
          </CardTitle>
          <CardDescription>
            Displayed on your About page to tell your story.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="aboutBlurb">About Blurb</Label>
            <Textarea
              id="aboutBlurb"
              name="aboutBlurb"
              placeholder="Tell your customers what makes your dealership special..."
              className="min-h-[150px]"
              defaultValue={initialData?.aboutBlurb || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* Public Contact Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Public Contact Info
          </CardTitle>
          <CardDescription>
            Overrides for the contact details shown on your public website.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contactEmail" className="flex items-center gap-2">
              <Mail className="h-3 w-3" /> Public Email
            </Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="sales@dealership.com"
              defaultValue={initialData?.contactEmail || ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactPhone" className="flex items-center gap-2">
              <Phone className="h-3 w-3" /> Public Phone
            </Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              placeholder="(555) 123-4567"
              defaultValue={initialData?.contactPhone || ""}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Physical Address
            </Label>
            <Textarea
              id="address"
              name="address"
              placeholder="123 Electric Way, Green City, CA 94000"
              className="min-h-[80px]"
              defaultValue={initialData?.address || ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Branding
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

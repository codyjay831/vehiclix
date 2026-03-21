"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { useTenant } from "@/components/providers/TenantProvider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { postStorefrontPublicLead } from "@/lib/api/storefront-leads-client";

const requestSchema = z.object({
  // Section 1: Vehicle Preferences
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  yearMin: z.coerce.number().min(2010).max(new Date().getFullYear() + 1).optional().or(z.literal(0).transform(() => undefined)),
  yearMax: z.coerce.number().min(2010).max(new Date().getFullYear() + 1).optional().or(z.literal(0).transform(() => undefined)),
  trim: z.string().optional(),
  mileageMax: z.coerce.number().min(0).optional().or(z.literal(0).transform(() => undefined)),
  colorPrefs: z.string().optional(),
  features: z.string().optional(),

  // Section 2: Budget & Timeline
  budgetMax: z.coerce.number().min(5000, "Minimum budget is $5,000"),
  timeline: z.string().optional(),

  // Section 3: Additional Info
  financingInterest: z.boolean().default(false),
  tradeInInterest: z.boolean().default(false),
  notes: z.string().max(2000).optional(),

  // Section 4: Contact Info
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export function VehicleRequestForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const tenant = useTenant();
  const router = useRouter();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema) as any,
    defaultValues: {
      make: "",
      model: "",
      financingInterest: false,
      tradeInInterest: false,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    if (!tenant) return;
    setIsSubmitting(true);
    try {
      const result = await postStorefrontPublicLead(
        {
          type: "vehicle_request",
          make: values.make,
          model: values.model,
          yearMin: values.yearMin,
          yearMax: values.yearMax,
          trim: values.trim,
          mileageMax: values.mileageMax,
          colorPrefs: values.colorPrefs,
          features: values.features,
          budgetMax: values.budgetMax,
          timeline: values.timeline,
          financingInterest: values.financingInterest,
          tradeInInterest: values.tradeInInterest,
          notes: values.notes,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
        },
        tenant.slug
      );

      if (result.ok) {
        router.push("/request-vehicle/confirmation");
        return;
      }
      toast.error(result.message);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
        {/* Section 1: Vehicle Preferences */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">1. Vehicle Preferences</h2>
            <p className="text-muted-foreground">Tell us exactly what you're looking for.</p>
          </div>
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden">
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Tesla, Rivian, Lucid" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Model Y, R1S, Air" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="yearMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2010" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder={new Date().getFullYear().toString()} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="trim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Trim</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dual Motor, Performance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mileageMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Mileage</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="colorPrefs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Preferences</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., White exterior, Black interior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Must-Have Features</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List any features you can't live without (e.g., Autopilot, Premium Audio, Tow Hitch)" 
                        className="min-h-[100px] rounded-2xl"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Budget & Timeline */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">2. Budget & Timeline</h2>
            <p className="text-muted-foreground">Help us narrow down the search.</p>
          </div>
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden">
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="budgetMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Target Price (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-4 top-2.5 font-bold text-muted-foreground">$</span>
                        <Input type="number" className="pl-8" placeholder="50000" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>Minimum $5,000</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Timeline</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="When do you need it?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="as-soon-as-possible">As soon as possible</SelectItem>
                        <SelectItem value="within-1-month">Within 1 month</SelectItem>
                        <SelectItem value="within-3-months">Within 3 months</SelectItem>
                        <SelectItem value="no-rush">No rush</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Additional Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">3. Additional Info</h2>
            <p className="text-muted-foreground">Other details that might help.</p>
          </div>
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="financingInterest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border-2 rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold cursor-pointer">
                          Interested in financing?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeInInterest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border-2 rounded-2xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-bold cursor-pointer">
                          Have a vehicle to trade in?
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Anything else we should know?" 
                        className="min-h-[120px] rounded-2xl"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Section 4: Contact Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">4. Contact Info</h2>
            <p className="text-muted-foreground">Where should we send your updates?</p>
          </div>
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden bg-primary/5 border-primary/10">
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input className="bg-background" placeholder="E.g., John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input className="bg-background" placeholder="E.g., Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input className="bg-background" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input className="bg-background" placeholder="(555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-8">
          <Button 
            type="submit" 
            size="lg" 
            className="h-16 px-12 rounded-full font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-primary/20 transition-all group"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Request
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

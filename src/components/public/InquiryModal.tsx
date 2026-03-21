"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ContactMethod, SerializedVehicle } from "@/types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  inquiryVehicleRefForPublicLead,
  postStorefrontPublicLead,
} from "@/lib/api/storefront-leads-client";
import { useTenant } from "@/components/providers/TenantProvider";
import { CheckCircle2, Loader2, MessageSquare, Phone, Mail } from "lucide-react";

const inquirySchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  preferredContact: z.nativeEnum(ContactMethod),
  message: z.string().max(2000, "Message is too long").optional(),
  tradeInInterest: z.boolean().default(false),
  financingInterest: z.boolean().default(false),
  honeypot: z.string().optional(), // Bot prevention
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

interface InquiryModalProps {
  vehicle: SerializedVehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InquiryModal({ vehicle, open, onOpenChange }: InquiryModalProps) {
  const tenant = useTenant();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredContact: "EITHER" as ContactMethod,
      message: "",
      tradeInInterest: false,
      financingInterest: false,
      honeypot: "",
    },
  });

  const onSubmit = async (values: InquiryFormValues) => {
    setIsSubmitting(true);
    try {
      const vehicleRef = inquiryVehicleRefForPublicLead(vehicle);
      const result = await postStorefrontPublicLead(
        {
          type: "inquiry",
          ...vehicleRef,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          preferredContact: values.preferredContact,
          message: values.message,
          tradeInInterest: values.tradeInInterest,
          financingInterest: values.financingInterest,
          honeypot: values.honeypot,
        },
        tenant?.slug
      );

      if (result.ok) {
        setIsSuccess(true);
        form.reset();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset success state after a delay so the customer sees the success screen
    setTimeout(() => {
      setIsSuccess(false);
      form.reset();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        {!isSuccess ? (
          <>
            <DialogHeader className="bg-primary/5 p-6 border-b">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                  Ask About This {vehicle.make}
                </DialogTitle>
              </div>
              <DialogDescription className="text-sm font-medium">
                Our team will review your inquiry and reach out within one business day.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Honeypot field (hidden from humans) */}
                <div className="hidden">
                  <FormField
                    control={form.control}
                    name="honeypot"
                    render={({ field }) => <Input {...field} tabIndex={-1} autoComplete="off" />}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., John" {...field} />
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
                          <Input placeholder="E.g., Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" type="email" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 000-0000" type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preferredContact"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Preferred Contact Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="EMAIL" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center gap-1 cursor-pointer">
                              <Mail className="h-3 w-3" /> Email
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="PHONE" />
                            </FormControl>
                            <FormLabel className="font-normal flex items-center gap-1 cursor-pointer">
                              <Phone className="h-3 w-3" /> Phone
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="EITHER" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">Either</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What would you like to know?" 
                          className="min-h-[80px] rounded-xl"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-primary/5">
                  <FormField
                    control={form.control}
                    name="tradeInInterest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-bold cursor-pointer">
                            I have a vehicle to trade in
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financingInterest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-bold cursor-pointer">
                            I'm interested in financing
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-full font-black uppercase tracking-widest shadow-lg hover:shadow-primary/20 transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Inquiry"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <div className="p-12 text-center space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">Thanks, {form.getValues("firstName")}!</h2>
              <p className="text-muted-foreground font-medium leading-relaxed">
                We've received your inquiry about the {vehicle.year} {vehicle.make} {vehicle.model}. 
                Someone from our team will reach out within one business day.
              </p>
            </div>
            <Button 
              onClick={handleClose} 
              className="w-full h-12 rounded-full font-black uppercase tracking-widest"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

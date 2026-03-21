"use client";

import * as React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StripeReservationForm } from "@/components/public/StripeReservationForm";
import {
  postStorefrontPublicReservation,
  reservationVehicleRefForPublicLead,
} from "@/lib/api/storefront-reservations-client";
import { toast } from "sonner";
import { ChevronLeft, CarFront, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
});

type ContactValues = z.infer<typeof contactSchema>;

interface ReservationClientPageProps {
  vehicleId: string;
  /** Public catalog slug when available (preferred for API vehicle reference). */
  vehicleSlug?: string | null;
  dealerSlug: string;
  organizationName: string;
}

export function ReservationClientPage({
  vehicleId,
  vehicleSlug,
  dealerSlug,
  organizationName,
}: ReservationClientPageProps) {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [dealId, setDealId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<"VEHICLE_UNAVAILABLE" | "SERVER_ERROR" | null>(null);
  const [isInitiating, setIsInitiating] = React.useState(false);

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const onInitiate = async (values: ContactValues) => {
    setIsInitiating(true);
    setError(null);

    try {
      const vehicleRef = reservationVehicleRefForPublicLead({
        id: vehicleId,
        slug: vehicleSlug ?? null,
      });
      const result = await postStorefrontPublicReservation(
        {
          ...vehicleRef,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
        },
        dealerSlug
      );

      if (result.ok) {
        setClientSecret(result.clientSecret);
        setDealId(result.dealId);
      } else if (result.vehicleUnavailable) {
        setError("VEHICLE_UNAVAILABLE");
      } else {
        setError("SERVER_ERROR");
        toast.error(result.message);
      }
    } catch {
      setError("SERVER_ERROR");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsInitiating(false);
    }
  };

  if (error === "VEHICLE_UNAVAILABLE") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-8 max-w-xl mx-auto">
        <div className="bg-destructive/10 p-6 rounded-full">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none italic">
            Vehicle <span className="text-destructive">Unavailable</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            This vehicle was just reserved by another customer. We're sorry for the inconvenience.
          </p>
        </div>
        <Link href={`/${dealerSlug}/inventory`} className="w-full">
          <Button size="lg" className="w-full h-16 rounded-full font-black uppercase tracking-widest shadow-lg">
            <ChevronLeft className="mr-2 h-5 w-5" />
            Return to Showroom
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col space-y-12 max-w-5xl mx-auto">
        {/* Header */}
        <div className="space-y-4 text-center md:text-left">
          <Link href={`/${dealerSlug}/inventory/${vehicleId}`}>
            <Button variant="ghost" size="sm" className="pl-0 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors">
              <ChevronLeft className="mr-1 h-3 w-3" />
              Back to Vehicle Details
            </Button>
          </Link>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Reserve Your <span className="text-primary">{organizationName.split(' ')[0]} EV</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl">
            Place a refundable reservation deposit to hold this vehicle. 
            Your deposit is fully credited toward the final purchase price.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Side */}
          <div className="lg:col-span-7 space-y-12">
            {!clientSecret ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onInitiate)} className="space-y-8">
                  <div className="bg-background rounded-3xl p-8 border-2 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b pb-6">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <CarFront className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Your Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase text-[10px] font-black tracking-[0.2em] text-muted-foreground ml-1">First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" className="h-12 rounded-xl border-2" {...field} />
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
                            <FormLabel className="uppercase text-[10px] font-black tracking-[0.2em] text-muted-foreground ml-1">Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" className="h-12 rounded-xl border-2" {...field} />
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
                            <FormLabel className="uppercase text-[10px] font-black tracking-[0.2em] text-muted-foreground ml-1">Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="john@example.com" className="h-12 rounded-xl border-2" {...field} />
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
                            <FormLabel className="uppercase text-[10px] font-black tracking-[0.2em] text-muted-foreground ml-1">Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 000-0000" className="h-12 rounded-xl border-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-16 rounded-full text-lg font-black uppercase tracking-widest shadow-xl group"
                    disabled={isInitiating}
                  >
                    {isInitiating ? "Initiating..." : "Continue to Payment"}
                    {!isInitiating && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </form>
              </Form>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeReservationForm dealId={dealId!} />
              </Elements>
            )}
          </div>

          {/* Info Side */}
          <div className="lg:col-span-5 space-y-8">
            <Card className="rounded-3xl border-2 shadow-none bg-primary/5 border-primary/10 overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-tight italic">The Reservation Guarantee</h3>
                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 bg-primary/10 p-2 h-fit rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm tracking-tight">Full Priority</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The vehicle is immediately held for you and hidden from other buyers.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 bg-primary/10 p-2 h-fit rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm tracking-tight">100% Refundable</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Changed your mind? No problem. The deposit is fully refundable before contract signing.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="flex-shrink-0 bg-primary/10 p-2 h-fit rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black uppercase text-sm tracking-tight">Transparency First</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        No dealership markups or hidden fees. What you see is exactly what you pay.
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

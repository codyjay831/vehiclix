/**
 * Public input contract for API v1 lead creation.
 * No client authority fields (organizationId is never accepted).
 * Used by POST /v1/public/leads.
 */

import { z } from "zod";

const contactMethodSchema = z.enum(["EMAIL", "PHONE", "EITHER"]);

/** Vehicle inquiry lead: requires vehicle reference (slug or id) and contact info. */
export const inquiryLeadInputSchema = z.object({
  type: z.literal("inquiry"),
  vehicleSlug: z.string().min(1).optional(),
  vehicleId: z.string().uuid().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone is required"),
  preferredContact: contactMethodSchema.default("EMAIL"),
  message: z.string().max(2000).optional(),
  tradeInInterest: z.boolean().default(false),
  financingInterest: z.boolean().default(false),
  honeypot: z.string().optional(),
}).refine(
  (data) => data.vehicleSlug != null || data.vehicleId != null,
  { message: "Either vehicleSlug or vehicleId is required for inquiry", path: ["vehicleSlug"] }
);

/** Vehicle sourcing request lead: make/model/contact, no vehicle reference. */
export const vehicleRequestLeadInputSchema = z.object({
  type: z.literal("vehicle_request"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  yearMin: z.coerce.number().int().min(2010).max(new Date().getFullYear() + 1).optional(),
  yearMax: z.coerce.number().int().min(2010).max(new Date().getFullYear() + 1).optional(),
  trim: z.string().max(100).optional(),
  mileageMax: z.coerce.number().int().min(0).optional(),
  colorPrefs: z.string().max(200).optional(),
  features: z.string().max(500).optional(),
  budgetMax: z.coerce.number().min(5000, "Minimum budget is $5,000"),
  timeline: z.string().max(100).optional(),
  financingInterest: z.boolean().default(false),
  tradeInInterest: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone is required"),
});

export const publicLeadInputSchema = z.discriminatedUnion("type", [
  inquiryLeadInputSchema,
  vehicleRequestLeadInputSchema,
]);

export type InquiryLeadInput = z.infer<typeof inquiryLeadInputSchema>;
export type VehicleRequestLeadInput = z.infer<typeof vehicleRequestLeadInputSchema>;
export type PublicLeadInput = z.infer<typeof publicLeadInputSchema>;

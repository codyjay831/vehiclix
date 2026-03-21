/**
 * Public input contract for API v1 reservation initiation.
 * No client authority fields (organizationId is never accepted).
 * Used by POST /v1/public/reservations.
 */

import { z } from "zod";

/** Reservation initiation: vehicle reference (slug or id) + contact info. */
export const publicReservationInputSchema = z
  .object({
    vehicleSlug: z.string().min(1).optional(),
    vehicleId: z.string().uuid().optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(10, "Valid phone is required"),
    message: z.string().max(2000).optional(),
  })
  .refine(
    (data) => data.vehicleSlug != null || data.vehicleId != null,
    { message: "Either vehicleSlug or vehicleId is required", path: ["vehicleSlug"] }
  );

export type PublicReservationInput = z.infer<typeof publicReservationInputSchema>;

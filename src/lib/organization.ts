import { db } from "./db";

/**
 * Resolves the default organization (Evo Motors).
 * Used as a fallback when no specific organization context is provided.
 */
export async function getDefaultOrganization() {
  const org = await db.organization.findUnique({
    where: { slug: "evo-motors" },
  });

  if (!org) {
    throw new Error("Default organization (Evo Motors) not found. Please run seed script.");
  }

  return org;
}

/**
 * Fetches an organization by its ID.
 */
export async function getOrganizationById(id: string) {
  return db.organization.findUnique({
    where: { id },
  });
}

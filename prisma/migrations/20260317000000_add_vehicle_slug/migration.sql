-- Add Vehicle.slug (nullable) for canon-aligned public identity.
-- Uniqueness is per organization: (organizationId, slug).
-- Backfill existing rows via scripts/backfill-vehicle-slugs.ts before relying on slug in API.

ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_organizationId_slug_key" ON "Vehicle"("organizationId", "slug");

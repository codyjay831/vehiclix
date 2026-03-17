-- AlterTable (Phase 2 VIN decoder: optional structured fields)
ALTER TABLE "Vehicle" ADD COLUMN "bodyStyle" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "fuelType" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "transmission" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "doors" INTEGER;

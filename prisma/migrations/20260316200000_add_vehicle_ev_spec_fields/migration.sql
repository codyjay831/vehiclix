-- AlterTable (EV-specific optional fields)
ALTER TABLE "Vehicle" ADD COLUMN "batteryCapacityKWh" DOUBLE PRECISION;
ALTER TABLE "Vehicle" ADD COLUMN "batteryChemistry" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "chargingStandard" TEXT;

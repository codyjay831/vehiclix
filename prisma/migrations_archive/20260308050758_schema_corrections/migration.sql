/*
  Warnings:

  - Changed the type of `condition` on the `TradeInCapture` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `condition` on the `Vehicle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "TradeInCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- AlterTable
ALTER TABLE "DocuSignEnvelope" ALTER COLUMN "sentAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TradeInCapture" DROP COLUMN "condition",
ADD COLUMN     "condition" "TradeInCondition" NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "condition",
ADD COLUMN     "condition" "InventoryCondition" NOT NULL;

-- DropEnum
DROP TYPE "VehicleCondition";

-- CreateIndex
CREATE INDEX "ActivityEvent_entityType_entityId_idx" ON "ActivityEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Deal_vehicleId_idx" ON "Deal"("vehicleId");

-- CreateIndex
CREATE INDEX "Deal_userId_idx" ON "Deal"("userId");

-- CreateIndex
CREATE INDEX "DealDeposit_dealId_idx" ON "DealDeposit"("dealId");

-- CreateIndex
CREATE INDEX "DealDocument_dealId_idx" ON "DealDocument"("dealId");

-- CreateIndex
CREATE INDEX "DocuSignEnvelope_dealId_idx" ON "DocuSignEnvelope"("dealId");

-- CreateIndex
CREATE INDEX "EnergyServiceRequest_userId_idx" ON "EnergyServiceRequest"("userId");

-- CreateIndex
CREATE INDEX "EnergyServiceRequest_dealId_idx" ON "EnergyServiceRequest"("dealId");

-- CreateIndex
CREATE INDEX "EnergyServiceStatusHistory_requestId_idx" ON "EnergyServiceStatusHistory"("requestId");

-- CreateIndex
CREATE INDEX "TradeInCapture_userId_idx" ON "TradeInCapture"("userId");

-- CreateIndex
CREATE INDEX "TradeInCapture_vehicleId_idx" ON "TradeInCapture"("vehicleId");

-- CreateIndex
CREATE INDEX "TradeInCapture_inquiryId_idx" ON "TradeInCapture"("inquiryId");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleStatus_idx" ON "Vehicle"("vehicleStatus");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_vehicleId_idx" ON "VehicleInquiry"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_userId_idx" ON "VehicleInquiry"("userId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_vehicleId_email_createdAt_idx" ON "VehicleInquiry"("vehicleId", "email", "createdAt");

-- CreateIndex
CREATE INDEX "VehicleMedia_vehicleId_idx" ON "VehicleMedia"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleProposal_requestId_idx" ON "VehicleProposal"("requestId");

-- CreateIndex
CREATE INDEX "VehicleRequest_userId_idx" ON "VehicleRequest"("userId");

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "VehicleInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceRequest" ADD CONSTRAINT "EnergyServiceRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceStatusHistory" ADD CONSTRAINT "EnergyServiceStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EnergyServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

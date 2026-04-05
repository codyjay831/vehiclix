-- CreateTable
CREATE TABLE "VehicleListingDraft" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleListingDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleListingDraft_vehicleId_idx" ON "VehicleListingDraft"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleListingDraft_vehicleId_channel_key" ON "VehicleListingDraft"("vehicleId", "channel");

-- AddForeignKey
ALTER TABLE "VehicleListingDraft" ADD CONSTRAINT "VehicleListingDraft_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ActivityEvent" ADD COLUMN "organizationId" TEXT;

-- CreateTable
CREATE TABLE "OrganizationBranding" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#1A1A1A',
    "heroHeadline" TEXT,
    "heroSubheadline" TEXT,
    "aboutBlurb" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "socialImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBranding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBranding_organizationId_key" ON "OrganizationBranding"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DealDeposit_stripePaymentId_key" ON "DealDeposit"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocuSignEnvelope_envelopeId_key" ON "DocuSignEnvelope"("envelopeId");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_idx" ON "ActivityEvent"("organizationId");

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBranding" ADD CONSTRAINT "OrganizationBranding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

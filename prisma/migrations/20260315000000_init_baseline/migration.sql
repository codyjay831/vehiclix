-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'CUSTOMER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "BetaAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'LISTED', 'RESERVED', 'UNDER_CONTRACT', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Drivetrain" AS ENUM ('AWD', 'RWD', 'FWD');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "TradeInCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('CLEAN', 'SALVAGE', 'REBUILT', 'LEMON');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'REVIEWED', 'RESPONDED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VehicleRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SOURCING', 'VEHICLE_PROPOSED', 'CUSTOMER_APPROVED', 'CONVERTED_TO_DEAL', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PROPOSED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('LEAD', 'DEPOSIT_PENDING', 'DEPOSIT_RECEIVED', 'DOCUMENTS_PENDING', 'CONTRACTS_SENT', 'CONTRACTS_SIGNED', 'FINANCING_PENDING', 'READY_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnvelopeStatus" AS ENUM ('SENT', 'DELIVERED', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'EITHER');

-- CreateEnum
CREATE TYPE "EnergyServiceType" AS ENUM ('EV_CHARGER', 'SOLAR');

-- CreateEnum
CREATE TYPE "EnergyServiceStatus" AS ENUM ('INTEREST_CAPTURED', 'SUBMITTED_TO_BAYTECH', 'ACKNOWLEDGED', 'CONTACT_PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'APPOINTMENT', 'NEGOTIATING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INQUIRY', 'VEHICLE_REQUEST', 'RESERVATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'STAGE_CHANGE', 'INBOUND', 'ASSIGNMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('STARTER', 'PRO', 'PREMIUM');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationHomepage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "showPromo" BOOLEAN NOT NULL DEFAULT false,
    "promoText" VARCHAR(100),
    "heroHeadline" VARCHAR(100),
    "heroSubheadline" TEXT,
    "heroPrimaryCtaLabel" VARCHAR(30),
    "heroPrimaryCtaRoute" TEXT DEFAULT 'inventory',
    "showTrustHighlights" BOOLEAN NOT NULL DEFAULT true,
    "trustHighlightsJson" JSONB,
    "showFeaturedInventory" BOOLEAN NOT NULL DEFAULT true,
    "showTestimonial" BOOLEAN NOT NULL DEFAULT false,
    "testimonialQuote" TEXT,
    "testimonialAuthor" VARCHAR(100),
    "showAboutTeaser" BOOLEAN NOT NULL DEFAULT true,
    "aboutTeaser" TEXT,
    "showContactCta" BOOLEAN NOT NULL DEFAULT true,
    "contactCtaHeadline" VARCHAR(100),
    "contactCtaBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationHomepage_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "OrganizationDomain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isStub" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "mileage" INTEGER NOT NULL,
    "drivetrain" "Drivetrain" NOT NULL,
    "batteryRangeEstimate" INTEGER,
    "exteriorColor" TEXT NOT NULL,
    "interiorColor" TEXT NOT NULL,
    "titleStatus" "TitleStatus" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "highlights" TEXT[],
    "features" TEXT[],
    "internalNotes" TEXT,
    "vehicleStatus" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "condition" "InventoryCondition" NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMedia" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "documentLabel" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleInquiry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredContact" "ContactMethod" NOT NULL,
    "message" TEXT,
    "tradeInInterest" BOOLEAN NOT NULL DEFAULT false,
    "financingInterest" BOOLEAN NOT NULL DEFAULT false,
    "inquiryStatus" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "ownerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "VehicleInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeInCapture" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicleId" TEXT,
    "inquiryId" TEXT,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "trim" TEXT,
    "mileage" INTEGER NOT NULL,
    "vin" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" "TradeInCondition" NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TradeInCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearMin" INTEGER,
    "yearMax" INTEGER,
    "budgetMax" DECIMAL(12,2) NOT NULL,
    "mileageMax" INTEGER,
    "colorPrefs" TEXT,
    "features" TEXT,
    "timeline" TEXT,
    "financingInterest" BOOLEAN NOT NULL DEFAULT false,
    "tradeInInterest" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "requestStatus" "VehicleRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "ownerNotes" TEXT,
    "priority" "Priority",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "VehicleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleProposal" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "vin" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "estimatedPrice" DECIMAL(12,2) NOT NULL,
    "proposalStatus" "ProposalStatus" NOT NULL DEFAULT 'PROPOSED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealStatus" "DealStatus" NOT NULL DEFAULT 'LEAD',
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealDeposit" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "depositAmount" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentTimestamp" TIMESTAMP(3),

    CONSTRAINT "DealDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealDocument" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentStatus" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocuSignEnvelope" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "envelopeStatus" "EnvelopeStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DocuSignEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyServiceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT,
    "serviceType" "EnergyServiceType" NOT NULL,
    "serviceStatus" "EnergyServiceStatus" NOT NULL DEFAULT 'INTEREST_CAPTURED',
    "propertyAddress" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "EnergyServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyServiceStatusHistory" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "EnergyServiceStatus" NOT NULL,
    "changedBy" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyServiceStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaAccessRequest" (
    "id" TEXT NOT NULL,
    "dealershipName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "BetaAccessStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSentAt" TIMESTAMP(3),
    "tokenHash" TEXT NOT NULL,

    CONSTRAINT "OwnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "assignedToId" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "lastActivityAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "LeadActivityType" NOT NULL,
    "body" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "planKey" "PlanKey",
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationHomepage_organizationId_key" ON "OrganizationHomepage"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBranding_organizationId_key" ON "OrganizationBranding"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_hostname_key" ON "OrganizationDomain"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_verificationToken_key" ON "OrganizationDomain"("verificationToken");

-- CreateIndex
CREATE INDEX "OrganizationDomain_organizationId_idx" ON "OrganizationDomain"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationDomain_hostname_status_idx" ON "OrganizationDomain"("hostname", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleStatus_idx" ON "Vehicle"("vehicleStatus");

-- CreateIndex
CREATE INDEX "Vehicle_organizationId_idx" ON "Vehicle"("organizationId");

-- CreateIndex
CREATE INDEX "VehicleMedia_vehicleId_idx" ON "VehicleMedia"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDocument_vehicleId_idx" ON "VehicleDocument"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_vehicleId_idx" ON "VehicleInquiry"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_userId_idx" ON "VehicleInquiry"("userId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_organizationId_idx" ON "VehicleInquiry"("organizationId");

-- CreateIndex
CREATE INDEX "VehicleInquiry_vehicleId_email_createdAt_idx" ON "VehicleInquiry"("vehicleId", "email", "createdAt");

-- CreateIndex
CREATE INDEX "TradeInCapture_userId_idx" ON "TradeInCapture"("userId");

-- CreateIndex
CREATE INDEX "TradeInCapture_vehicleId_idx" ON "TradeInCapture"("vehicleId");

-- CreateIndex
CREATE INDEX "TradeInCapture_inquiryId_idx" ON "TradeInCapture"("inquiryId");

-- CreateIndex
CREATE INDEX "TradeInCapture_organizationId_idx" ON "TradeInCapture"("organizationId");

-- CreateIndex
CREATE INDEX "VehicleRequest_userId_idx" ON "VehicleRequest"("userId");

-- CreateIndex
CREATE INDEX "VehicleRequest_organizationId_idx" ON "VehicleRequest"("organizationId");

-- CreateIndex
CREATE INDEX "VehicleProposal_requestId_idx" ON "VehicleProposal"("requestId");

-- CreateIndex
CREATE INDEX "Deal_vehicleId_idx" ON "Deal"("vehicleId");

-- CreateIndex
CREATE INDEX "Deal_userId_idx" ON "Deal"("userId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DealDeposit_stripePaymentId_key" ON "DealDeposit"("stripePaymentId");

-- CreateIndex
CREATE INDEX "DealDeposit_dealId_idx" ON "DealDeposit"("dealId");

-- CreateIndex
CREATE INDEX "DealDocument_dealId_idx" ON "DealDocument"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "DocuSignEnvelope_envelopeId_key" ON "DocuSignEnvelope"("envelopeId");

-- CreateIndex
CREATE INDEX "DocuSignEnvelope_dealId_idx" ON "DocuSignEnvelope"("dealId");

-- CreateIndex
CREATE INDEX "EnergyServiceRequest_userId_idx" ON "EnergyServiceRequest"("userId");

-- CreateIndex
CREATE INDEX "EnergyServiceRequest_dealId_idx" ON "EnergyServiceRequest"("dealId");

-- CreateIndex
CREATE INDEX "EnergyServiceRequest_organizationId_idx" ON "EnergyServiceRequest"("organizationId");

-- CreateIndex
CREATE INDEX "EnergyServiceStatusHistory_requestId_idx" ON "EnergyServiceStatusHistory"("requestId");

-- CreateIndex
CREATE INDEX "ActivityEvent_entityType_entityId_idx" ON "ActivityEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_idx" ON "ActivityEvent"("organizationId");

-- CreateIndex
CREATE INDEX "BetaAccessRequest_status_idx" ON "BetaAccessRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerInvite_tokenHash_key" ON "OwnerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OwnerInvite_tokenHash_idx" ON "OwnerInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_lastActivityAt_idx" ON "Lead"("organizationId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_organizationId_createdAt_idx" ON "LeadActivity"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_organizationId_key" ON "OrganizationSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_stripeCustomerId_key" ON "OrganizationSubscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSubscription_stripeSubscriptionId_key" ON "OrganizationSubscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "OrganizationHomepage" ADD CONSTRAINT "OrganizationHomepage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBranding" ADD CONSTRAINT "OrganizationBranding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDomain" ADD CONSTRAINT "OrganizationDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMedia" ADD CONSTRAINT "VehicleMedia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInquiry" ADD CONSTRAINT "VehicleInquiry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInquiry" ADD CONSTRAINT "VehicleInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInquiry" ADD CONSTRAINT "VehicleInquiry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "VehicleInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRequest" ADD CONSTRAINT "VehicleRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRequest" ADD CONSTRAINT "VehicleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProposal" ADD CONSTRAINT "VehicleProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VehicleRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDeposit" ADD CONSTRAINT "DealDeposit_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocuSignEnvelope" ADD CONSTRAINT "DocuSignEnvelope_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceRequest" ADD CONSTRAINT "EnergyServiceRequest_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceRequest" ADD CONSTRAINT "EnergyServiceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceRequest" ADD CONSTRAINT "EnergyServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceStatusHistory" ADD CONSTRAINT "EnergyServiceStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EnergyServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerInvite" ADD CONSTRAINT "OwnerInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

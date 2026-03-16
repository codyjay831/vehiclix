-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'LISTED', 'RESERVED', 'UNDER_CONTRACT', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Drivetrain" AS ENUM ('AWD', 'RWD', 'FWD');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');

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
    "condition" "VehicleCondition" NOT NULL,
    "titleStatus" "TitleStatus" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "highlights" TEXT[],
    "features" TEXT[],
    "internalNotes" TEXT,
    "vehicleStatus" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "condition" "VehicleCondition" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "sentAt" TIMESTAMP(3) NOT NULL,
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

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- AddForeignKey
ALTER TABLE "VehicleMedia" ADD CONSTRAINT "VehicleMedia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInquiry" ADD CONSTRAINT "VehicleInquiry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInquiry" ADD CONSTRAINT "VehicleInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeInCapture" ADD CONSTRAINT "TradeInCapture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRequest" ADD CONSTRAINT "VehicleRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleProposal" ADD CONSTRAINT "VehicleProposal_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "VehicleRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDeposit" ADD CONSTRAINT "DealDeposit_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDocument" ADD CONSTRAINT "DealDocument_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocuSignEnvelope" ADD CONSTRAINT "DocuSignEnvelope_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyServiceRequest" ADD CONSTRAINT "EnergyServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

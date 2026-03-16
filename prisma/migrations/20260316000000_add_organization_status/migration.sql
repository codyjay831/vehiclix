-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE';

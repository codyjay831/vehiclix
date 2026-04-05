-- CreateEnum
CREATE TYPE "PublicSiteMode" AS ENUM ('FULL_STOREFRONT', 'INVENTORY_ONLY', 'DISABLED');

-- AlterTable
ALTER TABLE "OrganizationBranding" ADD COLUMN     "publicSiteMode" "PublicSiteMode" NOT NULL DEFAULT 'FULL_STOREFRONT';

-- UpdateData (Map old boolean to new enum)
UPDATE "OrganizationBranding" SET "publicSiteMode" = 'INVENTORY_ONLY' WHERE "storefrontEnabled" = false;

-- DropColumn
ALTER TABLE "OrganizationBranding" DROP COLUMN "storefrontEnabled";

/*
  Warnings:

  - You are about to drop the column `content` on the `VehicleListingDraft` table. All the data in the column will be lost.
  - Added the required column `body` to the `VehicleListingDraft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VehicleListingDraft" DROP COLUMN "content",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "length" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "tone" TEXT;

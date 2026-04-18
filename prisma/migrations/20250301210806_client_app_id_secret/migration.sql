/*
  Warnings:

  - Added the required column `clientId` to the `ClientApp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `ClientApp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ClientApp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClientApp" ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "clientSecret" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "lastEventId" TEXT,
ADD COLUMN     "lastEventType" TEXT,
ADD COLUMN     "lastStreamId" TEXT,
ADD COLUMN     "revision" INTEGER DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

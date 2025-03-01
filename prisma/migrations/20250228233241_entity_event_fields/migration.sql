/*
  Warnings:

  - The primary key for the `OrganizationMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `OrganizationMember` table. All the data in the column will be lost.
  - You are about to drop the `App` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppCustomer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppFeatureFlag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppPackage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppPermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AppRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "App" DROP CONSTRAINT "App_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "App" DROP CONSTRAINT "App_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "AppCustomer" DROP CONSTRAINT "AppCustomer_appId_fkey";

-- DropForeignKey
ALTER TABLE "AppFeatureFlag" DROP CONSTRAINT "AppFeatureFlag_appId_fkey";

-- DropForeignKey
ALTER TABLE "AppOrder" DROP CONSTRAINT "AppOrder_appId_fkey";

-- DropForeignKey
ALTER TABLE "AppOrder" DROP CONSTRAINT "AppOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "AppPackage" DROP CONSTRAINT "AppPackage_appId_fkey";

-- DropForeignKey
ALTER TABLE "AppPermission" DROP CONSTRAINT "AppPermission_role_fkey";

-- DropIndex
DROP INDEX "Organization_name_key";

-- DropIndex
DROP INDEX "OrganizationMember_organizationId_accountId_key";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "lastEventId" TEXT,
ADD COLUMN     "lastEventType" TEXT,
ADD COLUMN     "lastStreamId" TEXT,
ADD COLUMN     "revision" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "OrganizationMember" DROP CONSTRAINT "OrganizationMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("organizationId", "accountId");

-- DropTable
DROP TABLE "App";

-- DropTable
DROP TABLE "AppCustomer";

-- DropTable
DROP TABLE "AppFeatureFlag";

-- DropTable
DROP TABLE "AppOrder";

-- DropTable
DROP TABLE "AppPackage";

-- DropTable
DROP TABLE "AppPermission";

-- DropTable
DROP TABLE "AppRole";

-- CreateTable
CREATE TABLE "ClientApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "revision" INTEGER DEFAULT 0,
    "lastEventId" TEXT,
    "lastEventType" TEXT,
    "lastStreamId" TEXT,

    CONSTRAINT "ClientApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAppFeatureFlag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientAppId" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT DEFAULT 'This Feature is currently disabled',
    "revision" INTEGER DEFAULT 0,
    "lastEventId" TEXT,
    "lastEventType" TEXT,
    "lastStreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAppFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAppRole" (
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3),

    CONSTRAINT "ClientAppRole_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "ClientAppPermission" (
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "create" BOOLEAN NOT NULL DEFAULT false,
    "readOwn" BOOLEAN NOT NULL DEFAULT false,
    "readAny" BOOLEAN NOT NULL DEFAULT false,
    "updateOwn" BOOLEAN NOT NULL DEFAULT false,
    "updateAny" BOOLEAN NOT NULL DEFAULT false,
    "deleteOwn" BOOLEAN NOT NULL DEFAULT false,
    "deleteAny" BOOLEAN NOT NULL DEFAULT false,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3),

    CONSTRAINT "ClientAppPermission_pkey" PRIMARY KEY ("role","resource")
);

-- CreateTable
CREATE TABLE "ClientAppCustomer" (
    "id" TEXT NOT NULL,
    "clientAppId" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "revision" INTEGER DEFAULT 0,
    "lastEventId" TEXT,
    "lastEventType" TEXT,
    "lastStreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAppCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAppPackage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clientAppId" TEXT NOT NULL,
    "revision" INTEGER DEFAULT 0,
    "lastEventId" TEXT,
    "lastEventType" TEXT,
    "lastStreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAppPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAppOrder" (
    "id" TEXT NOT NULL,
    "clientAppId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "revision" INTEGER DEFAULT 0,
    "lastEventId" TEXT,
    "lastEventType" TEXT,
    "lastStreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAppOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAppFeatureFlag_name_key" ON "ClientAppFeatureFlag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAppRole_role_key" ON "ClientAppRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAppCustomer_clientAppId_id_key" ON "ClientAppCustomer"("clientAppId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAppCustomer_clientAppId_email_key" ON "ClientAppCustomer"("clientAppId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAppOrder_clientAppId_id_key" ON "ClientAppOrder"("clientAppId", "id");

-- AddForeignKey
ALTER TABLE "ClientApp" ADD CONSTRAINT "ClientApp_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "DeveloperAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApp" ADD CONSTRAINT "ClientApp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppFeatureFlag" ADD CONSTRAINT "ClientAppFeatureFlag_clientAppId_fkey" FOREIGN KEY ("clientAppId") REFERENCES "ClientApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppPermission" ADD CONSTRAINT "ClientAppPermission_role_fkey" FOREIGN KEY ("role") REFERENCES "ClientAppRole"("role") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppCustomer" ADD CONSTRAINT "ClientAppCustomer_clientAppId_fkey" FOREIGN KEY ("clientAppId") REFERENCES "ClientApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppPackage" ADD CONSTRAINT "ClientAppPackage_clientAppId_fkey" FOREIGN KEY ("clientAppId") REFERENCES "ClientApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppOrder" ADD CONSTRAINT "ClientAppOrder_clientAppId_fkey" FOREIGN KEY ("clientAppId") REFERENCES "ClientApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppOrder" ADD CONSTRAINT "ClientAppOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ClientAppCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

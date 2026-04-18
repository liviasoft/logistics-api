/*
  Warnings:

  - You are about to drop the column `creatorId` on the `ClientApp` table. All the data in the column will be lost.
  - Added the required column `developerId` to the `ClientApp` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClientApp" DROP CONSTRAINT "ClientApp_creatorId_fkey";

-- AlterTable
ALTER TABLE "ClientApp" DROP COLUMN "creatorId",
ADD COLUMN     "developerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ClientApp" ADD CONSTRAINT "ClientApp_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

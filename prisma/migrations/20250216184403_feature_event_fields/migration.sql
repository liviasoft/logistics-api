-- AlterTable
ALTER TABLE "FeatureFlag" ADD COLUMN     "lastEventId" TEXT,
ADD COLUMN     "lastEventType" TEXT,
ADD COLUMN     "lastStreamId" TEXT,
ADD COLUMN     "revision" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "DeveloperAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "revision" INTEGER DEFAULT 0,
    "lastEventId" TEXT,
    "lastEventType" TEXT,
    "lastStreamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperAccount_email_key" ON "DeveloperAccount"("email");

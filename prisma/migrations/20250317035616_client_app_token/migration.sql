-- CreateTable
CREATE TABLE "ClientAppToken" (
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAppToken_pkey" PRIMARY KEY ("token")
);

-- AddForeignKey
ALTER TABLE "ClientAppToken" ADD CONSTRAINT "ClientAppToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

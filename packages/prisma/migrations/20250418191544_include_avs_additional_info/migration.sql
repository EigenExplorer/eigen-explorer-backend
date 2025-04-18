-- CreateTable
CREATE TABLE "AvsAdditionalInfo" (
    "avsAddress" TEXT NOT NULL,
    "metadataKey" TEXT NOT NULL,
    "metadataContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvsAdditionalInfo_pkey" PRIMARY KEY ("avsAddress","metadataKey")
);

-- AddForeignKey
ALTER TABLE "AvsAdditionalInfo" ADD CONSTRAINT "AvsAdditionalInfo_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

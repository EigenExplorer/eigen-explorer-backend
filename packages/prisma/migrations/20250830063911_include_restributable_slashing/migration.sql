-- AlterTable
ALTER TABLE "OperatorSet" ADD COLUMN     "redistributionRecipient" TEXT;

-- CreateTable
CREATE TABLE "EventLogs_RedistributionAddressSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "redistributionRecipient" TEXT NOT NULL,

    CONSTRAINT "EventLogs_RedistributionAddressSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_RedistributionAddressSet_avs_operatorSetId_idx" ON "EventLogs_RedistributionAddressSet"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_RedistributionAddressSet_blockNumber_idx" ON "EventLogs_RedistributionAddressSet"("blockNumber");

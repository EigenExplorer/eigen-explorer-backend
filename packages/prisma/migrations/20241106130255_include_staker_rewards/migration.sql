-- CreateTable
CREATE TABLE "StakerRewardSnapshot" (
    "stakerAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "snapshot" TIMESTAMP(3) NOT NULL,
    "cumulativeAmount" DECIMAL(78,0) NOT NULL DEFAULT 0,

    CONSTRAINT "StakerRewardSnapshot_pkey" PRIMARY KEY ("stakerAddress","tokenAddress")
);

-- CreateTable
CREATE TABLE "User" (
    "address" TEXT NOT NULL,
    "apy" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "EventLogs_DistributionRootSubmitted" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "root" TEXT NOT NULL,
    "rewardsCalculationEndTimestamp" BIGINT NOT NULL,
    "activatedAt" BIGINT NOT NULL,

    CONSTRAINT "EventLogs_DistributionRootSubmitted_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "StakerRewardSnapshot_stakerAddress_snapshot_idx" ON "StakerRewardSnapshot"("stakerAddress", "snapshot");

-- CreateIndex
CREATE INDEX "EventLogs_DistributionRootSubmitted_blockNumber_rewardsCalc_idx" ON "EventLogs_DistributionRootSubmitted"("blockNumber", "rewardsCalculationEndTimestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_address_fkey" FOREIGN KEY ("address") REFERENCES "Staker"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

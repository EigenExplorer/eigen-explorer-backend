/*
  Warnings:

  - You are about to drop the column `apy` on the `Avs` table. All the data in the column will be lost.
  - You are about to drop the column `apy` on the `Operator` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Avs" DROP COLUMN "apy",
ADD COLUMN     "maxApy" DECIMAL(8,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Operator" DROP COLUMN "apy",
ADD COLUMN     "maxApy" DECIMAL(8,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StakerRewardSnapshot" (
    "stakerAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "cumulativeAmount" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StakerRewardSnapshot_pkey" PRIMARY KEY ("stakerAddress","tokenAddress")
);

-- CreateTable
CREATE TABLE "User" (
    "address" TEXT NOT NULL,
    "isTracked" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "MetricStakerRewardUnit" (
    "id" SERIAL NOT NULL,
    "stakerAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "cumulativeAmount" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "changeCumulativeAmount" DECIMAL(78,18) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricStakerRewardUnit_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "StakerRewardSnapshot_stakerAddress_idx" ON "StakerRewardSnapshot"("stakerAddress");

-- CreateIndex
CREATE INDEX "User_address_idx" ON "User"("address");

-- CreateIndex
CREATE INDEX "MetricStakerRewardUnit_stakerAddress_idx" ON "MetricStakerRewardUnit"("stakerAddress");

-- CreateIndex
CREATE INDEX "MetricStakerRewardUnit_timestamp_idx" ON "MetricStakerRewardUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricStakerRewardUnit_stakerAddress_tokenAddress_timestamp_key" ON "MetricStakerRewardUnit"("stakerAddress", "tokenAddress", "timestamp");

-- CreateIndex
CREATE INDEX "EventLogs_DistributionRootSubmitted_rewardsCalculationEndTi_idx" ON "EventLogs_DistributionRootSubmitted"("rewardsCalculationEndTimestamp");

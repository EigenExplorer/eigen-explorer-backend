-- AlterTable
ALTER TABLE "OperatorStrategyShares" ADD COLUMN     "slashedShares" TEXT NOT NULL DEFAULT '0';

-- AlterTable
ALTER TABLE "StakerStrategyShares" ADD COLUMN     "depositScalingFactor" TEXT NOT NULL DEFAULT '1000000000000000000';

-- CreateTable
CREATE TABLE "EventLogs_OperatorSharesSlashed" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "totalSlashedShares" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorSharesSlashed_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_DepositScalingFactorUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "newDepositScalingFactor" TEXT NOT NULL,

    CONSTRAINT "EventLogs_DepositScalingFactorUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesSlashed_operator_idx" ON "EventLogs_OperatorSharesSlashed"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesSlashed_blockNumber_idx" ON "EventLogs_OperatorSharesSlashed"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_DepositScalingFactorUpdated_staker_idx" ON "EventLogs_DepositScalingFactorUpdated"("staker");

-- CreateIndex
CREATE INDEX "EventLogs_DepositScalingFactorUpdated_blockNumber_idx" ON "EventLogs_DepositScalingFactorUpdated"("blockNumber");

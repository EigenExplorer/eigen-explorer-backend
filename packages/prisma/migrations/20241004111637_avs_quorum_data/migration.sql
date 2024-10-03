/*
  Warnings:

  - Added the required column `operatorId` to the `AvsOperator` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Avs" ADD COLUMN     "registryCoordinatorAddress" TEXT,
ADD COLUMN     "stakeRegistryAddress" TEXT;

-- AlterTable
ALTER TABLE "AvsOperator" ADD COLUMN     "operatorId" TEXT NOT NULL,
ADD COLUMN     "quorumNumbers" INTEGER[];

-- CreateTable
CREATE TABLE "AvsQuorum" (
    "avsAddress" TEXT NOT NULL,
    "quorumNumber" INTEGER NOT NULL,
    "minimumStake" BIGINT NOT NULL,

    CONSTRAINT "AvsQuorum_pkey" PRIMARY KEY ("avsAddress","quorumNumber")
);

-- CreateTable
CREATE TABLE "AvsQuorumStrategy" (
    "avsAddress" TEXT NOT NULL,
    "quorumNumber" INTEGER NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "multiplier" BIGINT NOT NULL,

    CONSTRAINT "AvsQuorumStrategy_pkey" PRIMARY KEY ("avsAddress","quorumNumber","strategyAddress")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorRegistered" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorRegistered_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorDeregistered" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorDeregistered_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_MinimumStakeForQuorumUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "quorumNumber" INTEGER NOT NULL,
    "minimumStake" INTEGER NOT NULL,

    CONSTRAINT "EventLogs_MinimumStakeForQuorumUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StrategyAddedToQuorum" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "quorumNumber" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StrategyAddedToQuorum_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StrategyRemovedFromQuorum" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "quorumNumber" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StrategyRemovedFromQuorum_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StrategyMultiplierUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "quorumNumber" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL,
    "multiplier" INTEGER NOT NULL,

    CONSTRAINT "EventLogs_StrategyMultiplierUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_OperatorRegistered_operator_operatorId_idx" ON "EventLogs_OperatorRegistered"("operator", "operatorId");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorRegistered_blockNumber_idx" ON "EventLogs_OperatorRegistered"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorDeregistered_operator_operatorId_idx" ON "EventLogs_OperatorDeregistered"("operator", "operatorId");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorDeregistered_blockNumber_idx" ON "EventLogs_OperatorDeregistered"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_MinimumStakeForQuorumUpdated_quorumNumber_idx" ON "EventLogs_MinimumStakeForQuorumUpdated"("quorumNumber");

-- CreateIndex
CREATE INDEX "EventLogs_MinimumStakeForQuorumUpdated_blockNumber_idx" ON "EventLogs_MinimumStakeForQuorumUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToQuorum_quorumNumber_idx" ON "EventLogs_StrategyAddedToQuorum"("quorumNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToQuorum_blockNumber_idx" ON "EventLogs_StrategyAddedToQuorum"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromQuorum_quorumNumber_idx" ON "EventLogs_StrategyRemovedFromQuorum"("quorumNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromQuorum_blockNumber_idx" ON "EventLogs_StrategyRemovedFromQuorum"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyMultiplierUpdated_quorumNumber_idx" ON "EventLogs_StrategyMultiplierUpdated"("quorumNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyMultiplierUpdated_blockNumber_idx" ON "EventLogs_StrategyMultiplierUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "AvsOperator_operatorId_idx" ON "AvsOperator"("operatorId");

-- AddForeignKey
ALTER TABLE "AvsQuorum" ADD CONSTRAINT "AvsQuorum_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsQuorumStrategy" ADD CONSTRAINT "AvsQuorumStrategy_avsAddress_quorumNumber_fkey" FOREIGN KEY ("avsAddress", "quorumNumber") REFERENCES "AvsQuorum"("avsAddress", "quorumNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

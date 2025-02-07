-- AlterTable
ALTER TABLE "Pod" ADD COLUMN     "beaconChainSlashingFactor" TEXT NOT NULL DEFAULT '1000000000000000000';

-- AlterTable
ALTER TABLE "WithdrawalQueued" ADD COLUMN     "isSlashable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharesToWithdraw" TEXT[];

-- CreateTable
CREATE TABLE "EventLogs_SlashingWithdrawalQueued" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "withdrawalRoot" TEXT NOT NULL,
    "staker" TEXT NOT NULL,
    "delegatedTo" TEXT NOT NULL,
    "withdrawer" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "startBlock" BIGINT NOT NULL,
    "strategies" TEXT[],
    "scaledShares" TEXT[],
    "sharesToWithdraw" TEXT[],

    CONSTRAINT "EventLogs_SlashingWithdrawalQueued_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_SlashingWithdrawalCompleted" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "withdrawalRoot" TEXT NOT NULL,

    CONSTRAINT "EventLogs_SlashingWithdrawalCompleted_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_AllocationDelaySet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "delay" BIGINT NOT NULL,
    "effectBlock" BIGINT NOT NULL,

    CONSTRAINT "EventLogs_AllocationDelaySet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_AllocationUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "strategy" TEXT NOT NULL,
    "magnitude" TEXT NOT NULL,
    "effectBlock" BIGINT NOT NULL,

    CONSTRAINT "EventLogs_AllocationUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_EncumberedMagnitudeUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "encumberedMagnitude" TEXT NOT NULL,

    CONSTRAINT "EventLogs_EncumberedMagnitudeUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_MaxMagnitudeUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "maxMagnitude" TEXT NOT NULL,

    CONSTRAINT "EventLogs_MaxMagnitudeUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorSlashed" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "strategies" TEXT[],
    "wadSlashed" TEXT[],
    "description" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorSlashed_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_AVSRegistrarSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "registrar" TEXT NOT NULL,

    CONSTRAINT "EventLogs_AVSRegistrarSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorSetCreated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,

    CONSTRAINT "EventLogs_OperatorSetCreated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorAddedToOperatorSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,

    CONSTRAINT "EventLogs_OperatorAddedToOperatorSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorRemovedFromOperatorSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,

    CONSTRAINT "EventLogs_OperatorRemovedFromOperatorSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StrategyAddedToOperatorSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "strategy" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StrategyAddedToOperatorSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StrategyRemovedFromOperatorSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "strategy" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StrategyRemovedFromOperatorSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_BeaconChainSlashingFactorDecreased" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "prevBeaconChainSlashingFactor" TEXT NOT NULL,
    "newBeaconChainSlashingFactor" TEXT NOT NULL,

    CONSTRAINT "EventLogs_BeaconChainSlashingFactorDecreased_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalQueued_withdrawalRoot_idx" ON "EventLogs_SlashingWithdrawalQueued"("withdrawalRoot");

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalQueued_blockNumber_idx" ON "EventLogs_SlashingWithdrawalQueued"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalCompleted_withdrawalRoot_idx" ON "EventLogs_SlashingWithdrawalCompleted"("withdrawalRoot");

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalCompleted_blockNumber_idx" ON "EventLogs_SlashingWithdrawalCompleted"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_AllocationDelaySet_blockNumber_idx" ON "EventLogs_AllocationDelaySet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_AllocationUpdated_blockNumber_idx" ON "EventLogs_AllocationUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_EncumberedMagnitudeUpdated_blockNumber_idx" ON "EventLogs_EncumberedMagnitudeUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_MaxMagnitudeUpdated_blockNumber_idx" ON "EventLogs_MaxMagnitudeUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSlashed_operator_avs_idx" ON "EventLogs_OperatorSlashed"("operator", "avs");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSlashed_blockNumber_idx" ON "EventLogs_OperatorSlashed"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_AVSRegistrarSet_blockNumber_idx" ON "EventLogs_AVSRegistrarSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSetCreated_blockNumber_idx" ON "EventLogs_OperatorSetCreated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAddedToOperatorSet_operator_avs_idx" ON "EventLogs_OperatorAddedToOperatorSet"("operator", "avs");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAddedToOperatorSet_blockNumber_idx" ON "EventLogs_OperatorAddedToOperatorSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorRemovedFromOperatorSet_operator_avs_idx" ON "EventLogs_OperatorRemovedFromOperatorSet"("operator", "avs");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorRemovedFromOperatorSet_blockNumber_idx" ON "EventLogs_OperatorRemovedFromOperatorSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToOperatorSet_avs_strategy_idx" ON "EventLogs_StrategyAddedToOperatorSet"("avs", "strategy");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToOperatorSet_blockNumber_idx" ON "EventLogs_StrategyAddedToOperatorSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromOperatorSet_avs_strategy_idx" ON "EventLogs_StrategyRemovedFromOperatorSet"("avs", "strategy");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromOperatorSet_blockNumber_idx" ON "EventLogs_StrategyRemovedFromOperatorSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_BeaconChainSlashingFactorDecreased_staker_idx" ON "EventLogs_BeaconChainSlashingFactorDecreased"("staker");

-- CreateIndex
CREATE INDEX "EventLogs_BeaconChainSlashingFactorDecreased_blockNumber_idx" ON "EventLogs_BeaconChainSlashingFactorDecreased"("blockNumber");

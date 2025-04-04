-- DropIndex
DROP INDEX "EventLogs_OperatorAddedToOperatorSet_operator_avs_idx";

-- DropIndex
DROP INDEX "EventLogs_OperatorRemovedFromOperatorSet_operator_avs_idx";

-- DropIndex
DROP INDEX "EventLogs_OperatorSlashed_operator_avs_idx";

-- DropIndex
DROP INDEX "EventLogs_StrategyAddedToOperatorSet_avs_strategy_idx";

-- DropIndex
DROP INDEX "EventLogs_StrategyRemovedFromOperatorSet_avs_strategy_idx";

-- AlterTable
ALTER TABLE "Avs" ADD COLUMN     "avsRegistrarAddress" TEXT;

-- CreateTable
CREATE TABLE "OperatorSet" (
    "avsAddress" TEXT NOT NULL,
    "operatorSetId" INTEGER NOT NULL,
    "strategies" TEXT[],
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorSet_pkey" PRIMARY KEY ("avsAddress","operatorSetId")
);

-- CreateTable
CREATE TABLE "AvsOperatorSet" (
    "avsAddress" TEXT NOT NULL,
    "operatorSetId" INTEGER NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "registered" BOOLEAN NOT NULL,
    "slashableUntil" BIGINT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvsOperatorSet_pkey" PRIMARY KEY ("avsAddress","operatorSetId","operatorAddress")
);

-- CreateTable
CREATE TABLE "AvsAllocation" (
    "avsAddress" TEXT NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "operatorSetId" INTEGER NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "magnitude" TEXT NOT NULL,
    "effectBlock" BIGINT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvsAllocation_pkey" PRIMARY KEY ("avsAddress","operatorSetId","operatorAddress","strategyAddress")
);

-- CreateTable
CREATE TABLE "AvsOperatorSlashed" (
    "id" SERIAL NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "operatorSetId" INTEGER NOT NULL,
    "strategies" TEXT[],
    "wadSlashed" TEXT[],
    "description" TEXT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvsOperatorSlashed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationDelay" (
    "operatorAddress" TEXT NOT NULL,
    "delay" BIGINT NOT NULL,
    "effectBlock" BIGINT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationDelay_pkey" PRIMARY KEY ("operatorAddress")
);

-- CreateTable
CREATE TABLE "OperatorStrategyMagnitude" (
    "operatorAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "maxMagnitude" TEXT NOT NULL,
    "encumberedMagnitude" TEXT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorStrategyMagnitude_pkey" PRIMARY KEY ("operatorAddress","strategyAddress")
);

-- CreateIndex
CREATE INDEX "OperatorSet_avsAddress_idx" ON "OperatorSet"("avsAddress");

-- CreateIndex
CREATE INDEX "AvsOperatorSet_operatorAddress_idx" ON "AvsOperatorSet"("operatorAddress");

-- CreateIndex
CREATE INDEX "AvsAllocation_avsAddress_idx" ON "AvsAllocation"("avsAddress");

-- CreateIndex
CREATE INDEX "AvsAllocation_operatorAddress_idx" ON "AvsAllocation"("operatorAddress");

-- CreateIndex
CREATE INDEX "AvsAllocation_avsAddress_operatorSetId_idx" ON "AvsAllocation"("avsAddress", "operatorSetId");

-- CreateIndex
CREATE INDEX "AvsOperatorSlashed_avsAddress_idx" ON "AvsOperatorSlashed"("avsAddress");

-- CreateIndex
CREATE INDEX "AvsOperatorSlashed_operatorAddress_idx" ON "AvsOperatorSlashed"("operatorAddress");

-- CreateIndex
CREATE INDEX "AvsOperatorSlashed_avsAddress_operatorSetId_idx" ON "AvsOperatorSlashed"("avsAddress", "operatorSetId");

-- CreateIndex
CREATE INDEX "OperatorStrategyMagnitude_operatorAddress_idx" ON "OperatorStrategyMagnitude"("operatorAddress");

-- CreateIndex
CREATE INDEX "EventLogs_AVSRegistrarSet_avs_idx" ON "EventLogs_AVSRegistrarSet"("avs");

-- CreateIndex
CREATE INDEX "EventLogs_AllocationDelaySet_operator_idx" ON "EventLogs_AllocationDelaySet"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_AllocationUpdated_avs_operatorSetId_idx" ON "EventLogs_AllocationUpdated"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_AllocationUpdated_operator_idx" ON "EventLogs_AllocationUpdated"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_EncumberedMagnitudeUpdated_operator_idx" ON "EventLogs_EncumberedMagnitudeUpdated"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_MaxMagnitudeUpdated_operator_idx" ON "EventLogs_MaxMagnitudeUpdated"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAddedToOperatorSet_avs_operatorSetId_idx" ON "EventLogs_OperatorAddedToOperatorSet"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAddedToOperatorSet_operator_idx" ON "EventLogs_OperatorAddedToOperatorSet"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorRemovedFromOperatorSet_avs_operatorSetId_idx" ON "EventLogs_OperatorRemovedFromOperatorSet"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorRemovedFromOperatorSet_operator_idx" ON "EventLogs_OperatorRemovedFromOperatorSet"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSetCreated_avs_operatorSetId_idx" ON "EventLogs_OperatorSetCreated"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSlashed_avs_operatorSetId_idx" ON "EventLogs_OperatorSlashed"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSlashed_operator_idx" ON "EventLogs_OperatorSlashed"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToOperatorSet_avs_operatorSetId_idx" ON "EventLogs_StrategyAddedToOperatorSet"("avs", "operatorSetId");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromOperatorSet_avs_operatorSetId_idx" ON "EventLogs_StrategyRemovedFromOperatorSet"("avs", "operatorSetId");

-- AddForeignKey
ALTER TABLE "OperatorSet" ADD CONSTRAINT "OperatorSet_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsOperatorSet" ADD CONSTRAINT "AvsOperatorSet_avsAddress_operatorSetId_fkey" FOREIGN KEY ("avsAddress", "operatorSetId") REFERENCES "OperatorSet"("avsAddress", "operatorSetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsOperatorSet" ADD CONSTRAINT "AvsOperatorSet_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsAllocation" ADD CONSTRAINT "AvsAllocation_avsAddress_operatorSetId_fkey" FOREIGN KEY ("avsAddress", "operatorSetId") REFERENCES "OperatorSet"("avsAddress", "operatorSetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsAllocation" ADD CONSTRAINT "AvsAllocation_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsOperatorSlashed" ADD CONSTRAINT "AvsOperatorSlashed_avsAddress_operatorSetId_operatorAddres_fkey" FOREIGN KEY ("avsAddress", "operatorSetId", "operatorAddress") REFERENCES "AvsOperatorSet"("avsAddress", "operatorSetId", "operatorAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationDelay" ADD CONSTRAINT "AllocationDelay_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorStrategyMagnitude" ADD CONSTRAINT "OperatorStrategyMagnitude_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
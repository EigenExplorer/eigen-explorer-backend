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

-- CreateIndex
CREATE INDEX "OperatorSet_avsAddress_operatorSetId_idx" ON "OperatorSet"("avsAddress", "operatorSetId");

-- CreateIndex
CREATE INDEX "AvsOperatorSet_avsAddress_operatorSetId_operatorAddress_idx" ON "AvsOperatorSet"("avsAddress", "operatorSetId", "operatorAddress");

-- CreateIndex
CREATE INDEX "AvsAllocation_avsAddress_operatorSetId_operatorAddress_stra_idx" ON "AvsAllocation"("avsAddress", "operatorSetId", "operatorAddress", "strategyAddress");

-- CreateIndex
CREATE INDEX "AvsOperatorSlashed_avsAddress_operatorSetId_idx" ON "AvsOperatorSlashed"("avsAddress", "operatorSetId");

-- CreateIndex
CREATE INDEX "AllocationDelay_operatorAddress_idx" ON "AllocationDelay"("operatorAddress");

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

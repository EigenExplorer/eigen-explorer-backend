/*
  Warnings:

  - Added the required column `activationEpoch` to the `Validator` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exitEpoch` to the `Validator` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AvsOperator" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Validator" ADD COLUMN     "activationEpoch" BIGINT NOT NULL,
ADD COLUMN     "exitEpoch" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "MetricAvsHourly" (
    "id" SERIAL NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "totalOperators" INTEGER NOT NULL,
    "totalStakers" INTEGER NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "changeOperators" INTEGER NOT NULL,
    "changeStakers" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricAvsHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricOperatorHourly" (
    "id" SERIAL NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "totalStakers" INTEGER NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "changeStakers" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricOperatorHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricStrategyHourly" (
    "id" SERIAL NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricStrategyHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEigenPodsHourly" (
    "id" SERIAL NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "totalPods" INTEGER NOT NULL,
    "changePods" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricEigenPodsHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricAvsHourly_avsAddress_idx" ON "MetricAvsHourly"("avsAddress");

-- CreateIndex
CREATE INDEX "MetricAvsHourly_timestamp_idx" ON "MetricAvsHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricAvsHourly_avsAddress_timestamp_key" ON "MetricAvsHourly"("avsAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricOperatorHourly_operatorAddress_idx" ON "MetricOperatorHourly"("operatorAddress");

-- CreateIndex
CREATE INDEX "MetricOperatorHourly_timestamp_idx" ON "MetricOperatorHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricOperatorHourly_operatorAddress_timestamp_key" ON "MetricOperatorHourly"("operatorAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricStrategyHourly_timestamp_idx" ON "MetricStrategyHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricStrategyHourly_strategyAddress_timestamp_key" ON "MetricStrategyHourly"("strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricEigenPodsHourly_timestamp_idx" ON "MetricEigenPodsHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricEigenPodsHourly_timestamp_key" ON "MetricEigenPodsHourly"("timestamp");

/*
  Warnings:

  - You are about to drop the `MetricAvsHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricAvsStrategyHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricDepositHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricEigenPodsHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricOperatorHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricOperatorStrategyHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricStrategyHourly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MetricWithdrawalHourly` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "MetricAvsHourly";

-- DropTable
DROP TABLE "MetricAvsStrategyHourly";

-- DropTable
DROP TABLE "MetricDepositHourly";

-- DropTable
DROP TABLE "MetricEigenPodsHourly";

-- DropTable
DROP TABLE "MetricOperatorHourly";

-- DropTable
DROP TABLE "MetricOperatorStrategyHourly";

-- DropTable
DROP TABLE "MetricStrategyHourly";

-- DropTable
DROP TABLE "MetricWithdrawalHourly";

-- CreateTable
CREATE TABLE "MetricAvsUnit" (
    "id" SERIAL NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "totalOperators" INTEGER NOT NULL,
    "totalStakers" INTEGER NOT NULL,
    "changeOperators" INTEGER NOT NULL,
    "changeStakers" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricAvsUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricAvsStrategyUnit" (
    "id" SERIAL NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricAvsStrategyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricOperatorUnit" (
    "id" SERIAL NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "totalStakers" INTEGER NOT NULL,
    "totalAvs" INTEGER NOT NULL,
    "changeStakers" INTEGER NOT NULL,
    "changeAvs" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricOperatorUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricOperatorStrategyUnit" (
    "id" SERIAL NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricOperatorStrategyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricStrategyUnit" (
    "id" SERIAL NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricStrategyUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEigenPodsUnit" (
    "id" SERIAL NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "totalPods" INTEGER NOT NULL,
    "changePods" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricEigenPodsUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDepositUnit" (
    "id" SERIAL NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "totalDeposits" INTEGER NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "changeDeposits" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDepositUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricWithdrawalUnit" (
    "id" SERIAL NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "totalWithdrawals" INTEGER NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "changeWithdrawals" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricWithdrawalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricAvsUnit_avsAddress_idx" ON "MetricAvsUnit"("avsAddress");

-- CreateIndex
CREATE INDEX "MetricAvsUnit_timestamp_idx" ON "MetricAvsUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricAvsUnit_avsAddress_timestamp_key" ON "MetricAvsUnit"("avsAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricAvsStrategyUnit_avsAddress_strategyAddress_idx" ON "MetricAvsStrategyUnit"("avsAddress", "strategyAddress");

-- CreateIndex
CREATE INDEX "MetricAvsStrategyUnit_timestamp_idx" ON "MetricAvsStrategyUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricAvsStrategyUnit_avsAddress_strategyAddress_timestamp_key" ON "MetricAvsStrategyUnit"("avsAddress", "strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricOperatorUnit_operatorAddress_idx" ON "MetricOperatorUnit"("operatorAddress");

-- CreateIndex
CREATE INDEX "MetricOperatorUnit_timestamp_idx" ON "MetricOperatorUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricOperatorUnit_operatorAddress_timestamp_key" ON "MetricOperatorUnit"("operatorAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricOperatorStrategyUnit_operatorAddress_strategyAddress_idx" ON "MetricOperatorStrategyUnit"("operatorAddress", "strategyAddress");

-- CreateIndex
CREATE INDEX "MetricOperatorStrategyUnit_timestamp_idx" ON "MetricOperatorStrategyUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricOperatorStrategyUnit_operatorAddress_strategyAddress__key" ON "MetricOperatorStrategyUnit"("operatorAddress", "strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricStrategyUnit_timestamp_idx" ON "MetricStrategyUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricStrategyUnit_strategyAddress_timestamp_key" ON "MetricStrategyUnit"("strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricEigenPodsUnit_timestamp_idx" ON "MetricEigenPodsUnit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricEigenPodsUnit_timestamp_key" ON "MetricEigenPodsUnit"("timestamp");

-- CreateIndex
CREATE INDEX "MetricDepositUnit_timestamp_idx" ON "MetricDepositUnit"("timestamp");

-- CreateIndex
CREATE INDEX "MetricWithdrawalUnit_timestamp_idx" ON "MetricWithdrawalUnit"("timestamp");

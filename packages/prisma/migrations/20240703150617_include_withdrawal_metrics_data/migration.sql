/*
  Warnings:

  - You are about to drop the `Withdrawal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Withdrawal";

-- CreateTable
CREATE TABLE "WithdrawalQueued" (
    "withdrawalRoot" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "stakerAddress" TEXT NOT NULL,
    "delegatedTo" TEXT NOT NULL,
    "withdrawerAddress" TEXT NOT NULL,
    "strategies" TEXT[],
    "shares" TEXT[],
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalQueued_pkey" PRIMARY KEY ("withdrawalRoot")
);

-- CreateTable
CREATE TABLE "WithdrawalCompleted" (
    "withdrawalRoot" TEXT NOT NULL,
    "receiveAsTokens" BOOLEAN NOT NULL DEFAULT false,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalCompleted_pkey" PRIMARY KEY ("withdrawalRoot")
);

-- CreateTable
CREATE TABLE "EventLogs_PodSharesUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "podOwner" TEXT NOT NULL,
    "sharesDelta" TEXT NOT NULL,

    CONSTRAINT "EventLogs_PodSharesUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "MetricDepositHourly" (
    "id" SERIAL NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "totalDeposits" INTEGER NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "changeDeposits" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDepositHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricWithdrawalHourly" (
    "id" SERIAL NOT NULL,
    "tvlEth" DECIMAL(20,8) NOT NULL,
    "totalWithdrawals" INTEGER NOT NULL,
    "changeTvlEth" DECIMAL(20,8) NOT NULL,
    "changeWithdrawals" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricWithdrawalHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalQueued_withdrawalRoot_key" ON "WithdrawalQueued"("withdrawalRoot");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalCompleted_withdrawalRoot_key" ON "WithdrawalCompleted"("withdrawalRoot");

-- CreateIndex
CREATE INDEX "EventLogs_PodSharesUpdated_podOwner_idx" ON "EventLogs_PodSharesUpdated"("podOwner");

-- CreateIndex
CREATE INDEX "MetricDepositHourly_timestamp_idx" ON "MetricDepositHourly"("timestamp");

-- CreateIndex
CREATE INDEX "MetricWithdrawalHourly_timestamp_idx" ON "MetricWithdrawalHourly"("timestamp");

-- AddForeignKey
ALTER TABLE "WithdrawalCompleted" ADD CONSTRAINT "WithdrawalCompleted_withdrawalRoot_fkey" FOREIGN KEY ("withdrawalRoot") REFERENCES "WithdrawalQueued"("withdrawalRoot") ON DELETE RESTRICT ON UPDATE CASCADE;

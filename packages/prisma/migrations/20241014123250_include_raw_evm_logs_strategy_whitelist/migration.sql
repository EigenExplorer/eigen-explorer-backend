-- CreateTable
CREATE TABLE "EventLogs_StrategyAddedToDepositWhitelist" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "strategy" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StrategyAddedToDepositWhitelist_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StrategyRemovedFromDepositWhitelist" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "strategy" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StrategyRemovedFromDepositWhitelist_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToDepositWhitelist_strategy_idx" ON "EventLogs_StrategyAddedToDepositWhitelist"("strategy");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToDepositWhitelist_blockNumber_idx" ON "EventLogs_StrategyAddedToDepositWhitelist"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromDepositWhitelist_strategy_idx" ON "EventLogs_StrategyRemovedFromDepositWhitelist"("strategy");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromDepositWhitelist_blockNumber_idx" ON "EventLogs_StrategyRemovedFromDepositWhitelist"("blockNumber");

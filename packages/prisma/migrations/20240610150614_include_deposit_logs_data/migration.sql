-- CreateTable
CREATE TABLE "Deposit" (
    "transactionHash" TEXT NOT NULL,
    "stakerAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "shares" TEXT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("transactionHash")
);

-- CreateTable
CREATE TABLE "EventLogs_Deposit" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "shares" TEXT NOT NULL,

    CONSTRAINT "EventLogs_Deposit_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_transactionHash_key" ON "Deposit"("transactionHash");

-- CreateIndex
CREATE INDEX "EventLogs_Deposit_staker_idx" ON "EventLogs_Deposit"("staker");

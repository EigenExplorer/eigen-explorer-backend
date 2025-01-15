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

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalQueued_withdrawalRoot_idx" ON "EventLogs_SlashingWithdrawalQueued"("withdrawalRoot");

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalQueued_blockNumber_idx" ON "EventLogs_SlashingWithdrawalQueued"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalCompleted_withdrawalRoot_idx" ON "EventLogs_SlashingWithdrawalCompleted"("withdrawalRoot");

-- CreateIndex
CREATE INDEX "EventLogs_SlashingWithdrawalCompleted_blockNumber_idx" ON "EventLogs_SlashingWithdrawalCompleted"("blockNumber");

-- CreateTable
CREATE TABLE "EventLogs_WithdrawalQueued" (
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
    "shares" TEXT[],

    CONSTRAINT "EventLogs_WithdrawalQueued_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_WithdrawalQueued_withdrawalRoot_idx" ON "EventLogs_WithdrawalQueued"("withdrawalRoot");

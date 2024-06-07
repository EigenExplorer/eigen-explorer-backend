-- CreateTable
CREATE TABLE "EventLogs_WithdrawalCompleted" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "withdrawalRoot" TEXT NOT NULL,

    CONSTRAINT "EventLogs_WithdrawalCompleted_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_WithdrawalCompleted_withdrawalRoot_idx" ON "EventLogs_WithdrawalCompleted"("withdrawalRoot");

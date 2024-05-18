-- CreateTable
CREATE TABLE "Withdrawal" (
    "withdrawalRoot" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "stakerAddress" TEXT NOT NULL,
    "delegatedTo" TEXT NOT NULL,
    "withdrawerAddress" TEXT NOT NULL,
    "strategies" TEXT[],
    "shares" TEXT[],
    "startBlock" BIGINT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL,
    "updatedAtBlock" BIGINT NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("withdrawalRoot")
);

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_withdrawalRoot_key" ON "Withdrawal"("withdrawalRoot");

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
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalCompleted_pkey" PRIMARY KEY ("withdrawalRoot")
);

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalQueued_withdrawalRoot_key" ON "WithdrawalQueued"("withdrawalRoot");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalCompleted_withdrawalRoot_key" ON "WithdrawalCompleted"("withdrawalRoot");

-- AddForeignKey
ALTER TABLE "WithdrawalCompleted" ADD CONSTRAINT "WithdrawalCompleted_withdrawalRoot_fkey" FOREIGN KEY ("withdrawalRoot") REFERENCES "WithdrawalQueued"("withdrawalRoot") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Strategies" ADD COLUMN     "underlyingToken" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Tokens" (
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "cmcId" INTEGER NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "updatedAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tokens_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tokens_address_key" ON "Tokens"("address");

-- CreateTable
CREATE TABLE "EthPricesDaily" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "ethPrice" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EthPricesDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EthPricesDaily_timestamp_idx" ON "EthPricesDaily"("timestamp");

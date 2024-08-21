-- AlterTable
ALTER TABLE "Avs" ADD COLUMN     "sharesHash" TEXT,
ADD COLUMN     "tvlEth" DECIMAL(20,8) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "sharesHash" TEXT,
ADD COLUMN     "tvlEth" DECIMAL(20,8) NOT NULL DEFAULT 0;

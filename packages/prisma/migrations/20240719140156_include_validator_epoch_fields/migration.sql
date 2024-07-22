-- AlterTable
ALTER TABLE "Validator" ADD COLUMN     "activationEpoch" BIGINT NOT NULL,
ADD COLUMN     "exitEpoch" BIGINT NOT NULL,
ADD COLUMN     "pubkey" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

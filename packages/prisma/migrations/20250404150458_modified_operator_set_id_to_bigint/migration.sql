/*
  Warnings:

  - The primary key for the `AvsAllocation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AvsOperatorSet` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `OperatorSet` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "AvsAllocation" DROP CONSTRAINT "AvsAllocation_avsAddress_operatorSetId_fkey";

-- DropForeignKey
ALTER TABLE "AvsOperatorSet" DROP CONSTRAINT "AvsOperatorSet_avsAddress_operatorSetId_fkey";

-- DropForeignKey
ALTER TABLE "AvsOperatorSlashed" DROP CONSTRAINT "AvsOperatorSlashed_avsAddress_operatorSetId_operatorAddres_fkey";

-- AlterTable
ALTER TABLE "AvsAllocation" DROP CONSTRAINT "AvsAllocation_pkey",
ALTER COLUMN "operatorSetId" SET DATA TYPE BIGINT,
ADD CONSTRAINT "AvsAllocation_pkey" PRIMARY KEY ("avsAddress", "operatorSetId", "operatorAddress", "strategyAddress");

-- AlterTable
ALTER TABLE "AvsOperatorSet" DROP CONSTRAINT "AvsOperatorSet_pkey",
ALTER COLUMN "operatorSetId" SET DATA TYPE BIGINT,
ADD CONSTRAINT "AvsOperatorSet_pkey" PRIMARY KEY ("avsAddress", "operatorSetId", "operatorAddress");

-- AlterTable
ALTER TABLE "AvsOperatorSlashed" ALTER COLUMN "operatorSetId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "OperatorSet" DROP CONSTRAINT "OperatorSet_pkey",
ALTER COLUMN "operatorSetId" SET DATA TYPE BIGINT,
ADD CONSTRAINT "OperatorSet_pkey" PRIMARY KEY ("avsAddress", "operatorSetId");

-- AddForeignKey
ALTER TABLE "AvsOperatorSet" ADD CONSTRAINT "AvsOperatorSet_avsAddress_operatorSetId_fkey" FOREIGN KEY ("avsAddress", "operatorSetId") REFERENCES "OperatorSet"("avsAddress", "operatorSetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsAllocation" ADD CONSTRAINT "AvsAllocation_avsAddress_operatorSetId_fkey" FOREIGN KEY ("avsAddress", "operatorSetId") REFERENCES "OperatorSet"("avsAddress", "operatorSetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsOperatorSlashed" ADD CONSTRAINT "AvsOperatorSlashed_avsAddress_operatorSetId_operatorAddres_fkey" FOREIGN KEY ("avsAddress", "operatorSetId", "operatorAddress") REFERENCES "AvsOperatorSet"("avsAddress", "operatorSetId", "operatorAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

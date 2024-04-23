/*
  Warnings:

  - You are about to drop the column `delegatedTo` on the `Staker` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Staker" DROP COLUMN "delegatedTo",
ADD COLUMN     "operatorAddress" TEXT;

-- AddForeignKey
ALTER TABLE "Staker" ADD CONSTRAINT "Staker_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE SET NULL ON UPDATE CASCADE;

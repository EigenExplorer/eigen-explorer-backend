/*
  Warnings:

  - You are about to drop the `OperatorStrategyShares` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OperatorStrategyShares" DROP CONSTRAINT "OperatorStrategyShares_operatorAddress_fkey";

-- DropTable
DROP TABLE "OperatorStrategyShares";

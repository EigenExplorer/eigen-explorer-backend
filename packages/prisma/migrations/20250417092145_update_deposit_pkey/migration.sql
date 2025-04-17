/*
  Warnings:

  - The primary key for the `Deposit` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "Deposit_transactionHash_key";

-- AlterTable
ALTER TABLE "Deposit" DROP CONSTRAINT "Deposit_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id");

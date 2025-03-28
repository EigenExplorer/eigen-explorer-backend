/*
  Warnings:

  - You are about to drop the column `magnitude` on the `AvsAllocation` table. All the data in the column will be lost.
  - Added the required column `currentMagnitude` to the `AvsAllocation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pendingDiff` to the `AvsAllocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AvsAllocation" DROP COLUMN "magnitude",
ADD COLUMN     "currentMagnitude" TEXT NOT NULL,
ADD COLUMN     "pendingDiff" DECIMAL(39,0) NOT NULL;

/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `Strategies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sharesToUnderlying` to the `Strategies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Strategies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Strategies" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "sharesToUnderlying" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Strategies_address_key" ON "Strategies"("address");

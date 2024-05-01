/*
  Warnings:

  - You are about to drop the column `isVerified` on the `Avs` table. All the data in the column will be lost.
  - You are about to drop the column `isVisible` on the `Avs` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Avs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tags_1";

-- AlterTable
ALTER TABLE "Avs" DROP COLUMN "isVerified",
DROP COLUMN "isVisible",
DROP COLUMN "tags";

-- CreateTable
CREATE TABLE "AvsCuratedMetadata" (
    "avsAddress" TEXT NOT NULL,
    "metadataName" TEXT,
    "metadataDescription" TEXT,
    "metadataDiscord" TEXT,
    "metadataLogo" TEXT,
    "metadataTelegram" TEXT,
    "metadataWebsite" TEXT,
    "metadataX" TEXT,
    "tags" TEXT[],
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AvsCuratedMetadata_pkey" PRIMARY KEY ("avsAddress")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvsCuratedMetadata_avsAddress_key" ON "AvsCuratedMetadata"("avsAddress");

-- CreateIndex
CREATE INDEX "tags_1" ON "AvsCuratedMetadata"("tags");

-- AddForeignKey
ALTER TABLE "AvsCuratedMetadata" ADD CONSTRAINT "AvsCuratedMetadata_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

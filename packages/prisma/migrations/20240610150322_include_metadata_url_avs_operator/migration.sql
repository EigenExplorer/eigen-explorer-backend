-- AlterTable
ALTER TABLE "Avs" ADD COLUMN     "isMetadataSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadataUrl" TEXT;

-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "isMetadataSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadataUrl" TEXT;

-- AlterTable
ALTER TABLE "AvsCuratedMetadata" ADD COLUMN     "additionalConfig" JSONB;

-- AlterTable
ALTER TABLE "AvsCuratedMetadata" ADD COLUMN     "metadatasUpdatedAt" BIGINT[];

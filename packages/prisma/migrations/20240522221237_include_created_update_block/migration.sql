-- AlterTable
ALTER TABLE "Avs" ADD COLUMN     "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pod" ADD COLUMN     "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Staker" ADD COLUMN     "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAtBlock" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Withdrawal" ALTER COLUMN "createdAtBlock" SET DEFAULT 0,
ALTER COLUMN "updatedAtBlock" SET DEFAULT 0;

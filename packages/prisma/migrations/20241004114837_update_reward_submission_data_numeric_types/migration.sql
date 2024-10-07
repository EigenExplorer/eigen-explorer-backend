/*
  Warnings:

  - You are about to alter the column `multiplier` on the `AvsStrategyRewardSubmission` table. The data in that column could be lost. The data in that column will be cast from `Decimal(36,8)` to `Decimal(78,0)`.
  - You are about to alter the column `amount` on the `AvsStrategyRewardSubmission` table. The data in that column could be lost. The data in that column will be cast from `Decimal(36,8)` to `Decimal(78,0)`.

*/
-- AlterTable
ALTER TABLE "AvsStrategyRewardSubmission" ALTER COLUMN "multiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "EventLogs_AVSRewardsSubmission" ALTER COLUMN "rewardsSubmission_amount" DROP DEFAULT,
ALTER COLUMN "rewardsSubmission_amount" SET DATA TYPE TEXT,
ALTER COLUMN "strategiesAndMultipliers_multipliers" SET DATA TYPE TEXT[];

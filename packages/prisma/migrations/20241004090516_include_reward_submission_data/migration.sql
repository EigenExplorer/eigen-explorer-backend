-- CreateTable
CREATE TABLE "AvsStrategyRewardSubmission" (
    "id" SERIAL NOT NULL,
    "submissionNonce" BIGINT NOT NULL,
    "rewardsSubmissionHash" TEXT NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "multiplier" DECIMAL(36,8) NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(36,8) NOT NULL DEFAULT 0,
    "startTimestamp" BIGINT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvsStrategyRewardSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLogs_AVSRewardsSubmission" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "submissionNonce" BIGINT NOT NULL,
    "rewardsSubmissionHash" TEXT NOT NULL,
    "rewardsSubmission_token" TEXT NOT NULL,
    "rewardsSubmission_amount" DECIMAL(36,8) NOT NULL DEFAULT 0,
    "rewardsSubmission_startTimestamp" BIGINT NOT NULL,
    "rewardsSubmission_duration" INTEGER NOT NULL,
    "strategiesAndMultipliers_strategies" TEXT[],
    "strategiesAndMultipliers_multipliers" DECIMAL(36,8)[],

    CONSTRAINT "EventLogs_AVSRewardsSubmission_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_AVSRewardsSubmission_address_idx" ON "EventLogs_AVSRewardsSubmission"("address");

-- CreateIndex
CREATE INDEX "EventLogs_AVSRewardsSubmission_blockNumber_idx" ON "EventLogs_AVSRewardsSubmission"("blockNumber");

-- AddForeignKey
ALTER TABLE "AvsStrategyRewardSubmission" ADD CONSTRAINT "AvsStrategyRewardSubmission_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

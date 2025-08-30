-- CreateTable
CREATE TABLE "EventLogs_OperatorDirectedOperatorSetRewardsSubmission" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "caller" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "operatorDirectedRewardsSubmissionHash" TEXT NOT NULL,
    "submissionNonce" BIGINT NOT NULL,
    "operatorDirectedRewardsSubmission_token" TEXT NOT NULL,
    "operatorDirectedRewardsSubmission_startTimestamp" BIGINT NOT NULL,
    "operatorDirectedRewardsSubmission_duration" INTEGER NOT NULL,
    "operatorDirectedRewardsSubmission_description" TEXT NOT NULL,
    "strategiesAndMultipliers_strategies" TEXT[],
    "strategiesAndMultipliers_multipliers" TEXT[],
    "operatorRewards_operators" TEXT[],
    "operatorRewards_amounts" TEXT[],

    CONSTRAINT "EventLogs_OperatorDirectedOperatorSetRewardsSubmission_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "OperatorDirectedOperatorSetRewardsSubmission" (
    "id" SERIAL NOT NULL,
    "submissionNonce" BIGINT NOT NULL,
    "operatorDirectedRewardsSubmissionHash" TEXT NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "operatorSetId" BIGINT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "multiplier" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "startTimestamp" BIGINT NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorDirectedOperatorSetRewardsSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ODOSRS_address_idx" ON "EventLogs_OperatorDirectedOperatorSetRewardsSubmission"("address");

-- CreateIndex
CREATE INDEX "ODOSRS_blockNumber_idx" ON "EventLogs_OperatorDirectedOperatorSetRewardsSubmission"("blockNumber");

-- CreateIndex
CREATE INDEX "ODOSRS_blockTime_idx" ON "EventLogs_OperatorDirectedOperatorSetRewardsSubmission"("blockTime");

-- AddForeignKey
ALTER TABLE "OperatorDirectedOperatorSetRewardsSubmission" ADD CONSTRAINT "OperatorDirectedOperatorSetRewardsSubmission_avsAddress_op_fkey" FOREIGN KEY ("avsAddress", "operatorSetId", "operatorAddress") REFERENCES "AvsOperatorSet"("avsAddress", "operatorSetId", "operatorAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

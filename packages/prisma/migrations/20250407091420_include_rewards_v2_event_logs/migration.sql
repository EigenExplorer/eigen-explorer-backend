-- CreateTable
CREATE TABLE "EventLogs_OperatorDirectedAVSRewardsSubmission" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "caller" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
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

    CONSTRAINT "EventLogs_OperatorDirectedAVSRewardsSubmission_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorAVSSplitBipsSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "caller" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "activatedAt" BIGINT NOT NULL,
    "oldOperatorAVSSplitBips" INTEGER NOT NULL,
    "newOperatorAVSSplitBips" INTEGER NOT NULL,

    CONSTRAINT "EventLogs_OperatorAVSSplitBipsSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorPISplitBipsSet" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "caller" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "activatedAt" BIGINT NOT NULL,
    "oldOperatorPISplitBips" INTEGER NOT NULL,
    "newOperatorPISplitBips" INTEGER NOT NULL,

    CONSTRAINT "EventLogs_OperatorPISplitBipsSet_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateIndex
CREATE INDEX "EventLogs_OperatorDirectedAVSRewardsSubmission_address_idx" ON "EventLogs_OperatorDirectedAVSRewardsSubmission"("address");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorDirectedAVSRewardsSubmission_blockNumber_idx" ON "EventLogs_OperatorDirectedAVSRewardsSubmission"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorDirectedAVSRewardsSubmission_blockTime_idx" ON "EventLogs_OperatorDirectedAVSRewardsSubmission"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAVSSplitBipsSet_blockNumber_idx" ON "EventLogs_OperatorAVSSplitBipsSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAVSSplitBipsSet_blockTime_idx" ON "EventLogs_OperatorAVSSplitBipsSet"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorPISplitBipsSet_blockNumber_idx" ON "EventLogs_OperatorPISplitBipsSet"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorPISplitBipsSet_blockTime_idx" ON "EventLogs_OperatorPISplitBipsSet"("blockTime");

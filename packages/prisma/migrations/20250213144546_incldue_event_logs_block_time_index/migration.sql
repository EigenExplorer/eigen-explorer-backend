-- CreateIndex
CREATE INDEX "EventLogs_AVSMetadataURIUpdated_blockTime_idx" ON "EventLogs_AVSMetadataURIUpdated"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_AVSRewardsSubmission_blockTime_idx" ON "EventLogs_AVSRewardsSubmission"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_Deposit_blockTime_idx" ON "EventLogs_Deposit"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_DistributionRootSubmitted_blockNumber_idx" ON "EventLogs_DistributionRootSubmitted"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_DistributionRootSubmitted_blockTime_idx" ON "EventLogs_DistributionRootSubmitted"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAVSRegistrationStatusUpdated_blockTime_idx" ON "EventLogs_OperatorAVSRegistrationStatusUpdated"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorMetadataURIUpdated_blockTime_idx" ON "EventLogs_OperatorMetadataURIUpdated"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesDecreased_blockTime_idx" ON "EventLogs_OperatorSharesDecreased"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesIncreased_blockTime_idx" ON "EventLogs_OperatorSharesIncreased"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_PodDeployed_blockTime_idx" ON "EventLogs_PodDeployed"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_StakerDelegated_blockTime_idx" ON "EventLogs_StakerDelegated"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_StakerUndelegated_blockTime_idx" ON "EventLogs_StakerUndelegated"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyAddedToDepositWhitelist_blockTime_idx" ON "EventLogs_StrategyAddedToDepositWhitelist"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_StrategyRemovedFromDepositWhitelist_blockTime_idx" ON "EventLogs_StrategyRemovedFromDepositWhitelist"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_WithdrawalCompleted_blockTime_idx" ON "EventLogs_WithdrawalCompleted"("blockTime");

-- CreateIndex
CREATE INDEX "EventLogs_WithdrawalQueued_blockTime_idx" ON "EventLogs_WithdrawalQueued"("blockTime");

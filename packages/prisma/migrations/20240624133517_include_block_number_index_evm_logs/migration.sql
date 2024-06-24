-- CreateIndex
CREATE INDEX "EventLogs_AVSMetadataURIUpdated_blockNumber_idx" ON "EventLogs_AVSMetadataURIUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_Deposit_blockNumber_idx" ON "EventLogs_Deposit"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAVSRegistrationStatusUpdated_blockNumber_idx" ON "EventLogs_OperatorAVSRegistrationStatusUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorMetadataURIUpdated_blockNumber_idx" ON "EventLogs_OperatorMetadataURIUpdated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesDecreased_blockNumber_idx" ON "EventLogs_OperatorSharesDecreased"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesIncreased_blockNumber_idx" ON "EventLogs_OperatorSharesIncreased"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_PodDeployed_blockNumber_idx" ON "EventLogs_PodDeployed"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StakerDelegated_blockNumber_idx" ON "EventLogs_StakerDelegated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_StakerUndelegated_blockNumber_idx" ON "EventLogs_StakerUndelegated"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_WithdrawalCompleted_blockNumber_idx" ON "EventLogs_WithdrawalCompleted"("blockNumber");

-- CreateIndex
CREATE INDEX "EventLogs_WithdrawalQueued_blockNumber_idx" ON "EventLogs_WithdrawalQueued"("blockNumber");

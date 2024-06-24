-- CreateIndex
CREATE INDEX "Avs_createdAtBlock_idx" ON "Avs"("createdAtBlock");

-- CreateIndex
CREATE INDEX "AvsOperator_avsAddress_idx" ON "AvsOperator"("avsAddress");

-- CreateIndex
CREATE INDEX "Operator_createdAtBlock_idx" ON "Operator"("createdAtBlock");

-- CreateIndex
CREATE INDEX "OperatorStrategyShares_operatorAddress_idx" ON "OperatorStrategyShares"("operatorAddress");

-- CreateIndex
CREATE INDEX "Staker_operatorAddress_idx" ON "Staker"("operatorAddress");

-- CreateIndex
CREATE INDEX "StakerStrategyShares_stakerAddress_idx" ON "StakerStrategyShares"("stakerAddress");

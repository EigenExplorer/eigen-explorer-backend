-- CreateTable
CREATE TABLE "EventLogs_AVSMetadataURIUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "avs" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL,

    CONSTRAINT "EventLogs_AVSMetadataURIUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorMetadataURIUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "metadataURI" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorMetadataURIUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorAVSRegistrationStatusUpdated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "operator" TEXT NOT NULL,
    "avs" TEXT NOT NULL,
    "status" INTEGER NOT NULL,

    CONSTRAINT "EventLogs_OperatorAVSRegistrationStatusUpdated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_PodDeployed" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "eigenPod" TEXT NOT NULL,
    "podOwner" TEXT NOT NULL,

    CONSTRAINT "EventLogs_PodDeployed_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StakerDelegated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "operator" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StakerDelegated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_StakerUndelegated" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "operator" TEXT NOT NULL,

    CONSTRAINT "EventLogs_StakerUndelegated_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorSharesIncreased" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "shares" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorSharesIncreased_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "EventLogs_OperatorSharesDecreased" (
    "address" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "transactionIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "staker" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "shares" TEXT NOT NULL,

    CONSTRAINT "EventLogs_OperatorSharesDecreased_pkey" PRIMARY KEY ("transactionHash","transactionIndex")
);

-- CreateTable
CREATE TABLE "Evm_BlockData" (
    "number" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evm_BlockData_pkey" PRIMARY KEY ("number")
);

-- CreateIndex
CREATE INDEX "EventLogs_AVSMetadataURIUpdated_avs_idx" ON "EventLogs_AVSMetadataURIUpdated"("avs");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorMetadataURIUpdated_operator_idx" ON "EventLogs_OperatorMetadataURIUpdated"("operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorAVSRegistrationStatusUpdated_operator_avs_idx" ON "EventLogs_OperatorAVSRegistrationStatusUpdated"("operator", "avs");

-- CreateIndex
CREATE INDEX "EventLogs_PodDeployed_eigenPod_podOwner_idx" ON "EventLogs_PodDeployed"("eigenPod", "podOwner");

-- CreateIndex
CREATE INDEX "EventLogs_StakerDelegated_staker_operator_idx" ON "EventLogs_StakerDelegated"("staker", "operator");

-- CreateIndex
CREATE INDEX "EventLogs_StakerUndelegated_staker_operator_idx" ON "EventLogs_StakerUndelegated"("staker", "operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesIncreased_staker_operator_idx" ON "EventLogs_OperatorSharesIncreased"("staker", "operator");

-- CreateIndex
CREATE INDEX "EventLogs_OperatorSharesDecreased_staker_operator_idx" ON "EventLogs_OperatorSharesDecreased"("staker", "operator");

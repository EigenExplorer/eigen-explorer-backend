-- CreateTable
CREATE TABLE "Avs" (
    "address" TEXT NOT NULL,
    "tags" TEXT[],
    "metadataName" TEXT NOT NULL,
    "metadataDescription" TEXT NOT NULL,
    "metadataDiscord" TEXT,
    "metadataLogo" TEXT,
    "metadataTelegram" TEXT,
    "metadataWebsite" TEXT,
    "metadataX" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Avs_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "AvsOperator" (
    "avsAddress" TEXT NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,

    CONSTRAINT "AvsOperator_pkey" PRIMARY KEY ("avsAddress","operatorAddress")
);

-- CreateTable
CREATE TABLE "Strategies" (
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,

    CONSTRAINT "Strategies_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Operator" (
    "address" TEXT NOT NULL,
    "metadataName" TEXT NOT NULL,
    "metadataDescription" TEXT NOT NULL,
    "metadataDiscord" TEXT,
    "metadataLogo" TEXT,
    "metadataTelegram" TEXT,
    "metadataWebsite" TEXT,
    "metadataX" TEXT,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "OperatorStrategyShares" (
    "operatorAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "shares" TEXT NOT NULL,

    CONSTRAINT "OperatorStrategyShares_pkey" PRIMARY KEY ("operatorAddress","strategyAddress")
);

-- CreateTable
CREATE TABLE "Staker" (
    "address" TEXT NOT NULL,
    "operatorAddress" TEXT,

    CONSTRAINT "Staker_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "StakerStrategyShares" (
    "stakerAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "shares" TEXT NOT NULL,

    CONSTRAINT "StakerStrategyShares_pkey" PRIMARY KEY ("stakerAddress","strategyAddress")
);

-- CreateTable
CREATE TABLE "Pod" (
    "address" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,

    CONSTRAINT "Pod_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "ValidatorRestake" (
    "podAddress" TEXT NOT NULL,
    "validatorIndex" BIGINT NOT NULL,
    "blockNumber" BIGINT NOT NULL,

    CONSTRAINT "ValidatorRestake_pkey" PRIMARY KEY ("podAddress","validatorIndex")
);

-- CreateTable
CREATE TABLE "Validator" (
    "validatorIndex" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "balance" BIGINT NOT NULL,
    "effectiveBalance" BIGINT NOT NULL,
    "slashed" BOOLEAN NOT NULL,
    "withdrawalCredentials" TEXT NOT NULL,

    CONSTRAINT "Validator_pkey" PRIMARY KEY ("validatorIndex")
);

-- CreateTable
CREATE TABLE "Settings" (
    "key" TEXT NOT NULL,
    "value" JSON NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avs_address_key" ON "Avs"("address");

-- CreateIndex
CREATE INDEX "tags_1" ON "Avs"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_address_key" ON "Operator"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Staker_address_key" ON "Staker"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Pod_address_key" ON "Pod"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- AddForeignKey
ALTER TABLE "AvsOperator" ADD CONSTRAINT "AvsOperator_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvsOperator" ADD CONSTRAINT "AvsOperator_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorStrategyShares" ADD CONSTRAINT "OperatorStrategyShares_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staker" ADD CONSTRAINT "Staker_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakerStrategyShares" ADD CONSTRAINT "StakerStrategyShares_stakerAddress_fkey" FOREIGN KEY ("stakerAddress") REFERENCES "Staker"("address") ON DELETE RESTRICT ON UPDATE CASCADE;


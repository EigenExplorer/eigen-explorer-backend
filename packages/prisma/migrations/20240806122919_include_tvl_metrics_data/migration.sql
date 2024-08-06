-- CreateTable
CREATE TABLE "MetricAvsHourly" (
    "id" SERIAL NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "totalOperators" INTEGER NOT NULL,
    "totalStakers" INTEGER NOT NULL,
    "changeOperators" INTEGER NOT NULL,
    "changeStakers" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricAvsHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricAvsStrategyHourly" (
    "id" SERIAL NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricAvsStrategyHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricOperatorHourly" (
    "id" SERIAL NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "totalStakers" INTEGER NOT NULL,
    "totalAvs" INTEGER NOT NULL,
    "changeStakers" INTEGER NOT NULL,
    "changeAvs" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricOperatorHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricOperatorStrategyHourly" (
    "id" SERIAL NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricOperatorStrategyHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricStrategyHourly" (
    "id" SERIAL NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricStrategyHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEigenPodsHourly" (
    "id" SERIAL NOT NULL,
    "tvl" DECIMAL(20,8) NOT NULL,
    "changeTvl" DECIMAL(20,8) NOT NULL,
    "totalPods" INTEGER NOT NULL,
    "changePods" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricEigenPodsHourly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricAvsHourly_avsAddress_idx" ON "MetricAvsHourly"("avsAddress");

-- CreateIndex
CREATE INDEX "MetricAvsHourly_timestamp_idx" ON "MetricAvsHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricAvsHourly_avsAddress_timestamp_key" ON "MetricAvsHourly"("avsAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricAvsStrategyHourly_avsAddress_strategyAddress_idx" ON "MetricAvsStrategyHourly"("avsAddress", "strategyAddress");

-- CreateIndex
CREATE INDEX "MetricAvsStrategyHourly_timestamp_idx" ON "MetricAvsStrategyHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricAvsStrategyHourly_avsAddress_strategyAddress_timestam_key" ON "MetricAvsStrategyHourly"("avsAddress", "strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricOperatorHourly_operatorAddress_idx" ON "MetricOperatorHourly"("operatorAddress");

-- CreateIndex
CREATE INDEX "MetricOperatorHourly_timestamp_idx" ON "MetricOperatorHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricOperatorHourly_operatorAddress_timestamp_key" ON "MetricOperatorHourly"("operatorAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricOperatorStrategyHourly_operatorAddress_strategyAddres_idx" ON "MetricOperatorStrategyHourly"("operatorAddress", "strategyAddress");

-- CreateIndex
CREATE INDEX "MetricOperatorStrategyHourly_timestamp_idx" ON "MetricOperatorStrategyHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricOperatorStrategyHourly_operatorAddress_strategyAddres_key" ON "MetricOperatorStrategyHourly"("operatorAddress", "strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricStrategyHourly_timestamp_idx" ON "MetricStrategyHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricStrategyHourly_strategyAddress_timestamp_key" ON "MetricStrategyHourly"("strategyAddress", "timestamp");

-- CreateIndex
CREATE INDEX "MetricEigenPodsHourly_timestamp_idx" ON "MetricEigenPodsHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MetricEigenPodsHourly_timestamp_key" ON "MetricEigenPodsHourly"("timestamp");

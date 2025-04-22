-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "piSplitBips" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "OperatorDirectedAvsStrategyRewardsSubmission" (
    "id" SERIAL NOT NULL,
    "submissionNonce" BIGINT NOT NULL,
    "operatorDirectedRewardsSubmissionHash" TEXT NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "operatorAddress" TEXT NOT NULL,
    "strategyAddress" TEXT NOT NULL,
    "multiplier" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "startTimestamp" BIGINT NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorDirectedAvsStrategyRewardsSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorAvsSplit" (
    "operatorAddress" TEXT NOT NULL,
    "avsAddress" TEXT NOT NULL,
    "splitBips" INTEGER NOT NULL,
    "activatedAt" BIGINT NOT NULL,
    "createdAtBlock" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAvsSplit_pkey" PRIMARY KEY ("operatorAddress","avsAddress","activatedAt")
);

-- AddForeignKey
ALTER TABLE "OperatorDirectedAvsStrategyRewardsSubmission" ADD CONSTRAINT "OperatorDirectedAvsStrategyRewardsSubmission_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorDirectedAvsStrategyRewardsSubmission" ADD CONSTRAINT "OperatorDirectedAvsStrategyRewardsSubmission_operatorAddre_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAvsSplit" ADD CONSTRAINT "OperatorAvsSplit_operatorAddress_fkey" FOREIGN KEY ("operatorAddress") REFERENCES "Operator"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorAvsSplit" ADD CONSTRAINT "OperatorAvsSplit_avsAddress_fkey" FOREIGN KEY ("avsAddress") REFERENCES "Avs"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

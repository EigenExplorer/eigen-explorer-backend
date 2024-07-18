import 'dotenv/config';
import { expect } from 'chai';
import { getPrismaClient } from '../src/utils/prismaClient';
import { seedBlockData as originalSeedBlockData, seedBlockDataV2 as modifiedSeedBlockData } from '../src/blocks/seedBlockData';

describe('Seed Block Data', async function () {
  this.timeout(100000);

  it('should seed block data using original and modified methods and measure performance', async function () {
    // Define block ranges for testing
    const fromBlock1 = 1250000n;
    const toBlock1 = 1260000n;

    const fromBlock2 = 1260001n;
    const toBlock2 = 1270001n;

    // const prismaClient = getPrismaClient();

    // Measure performance for the original method
    const originalStart = performance.now();
    await originalSeedBlockData(toBlock1, fromBlock1);
    const originalEnd = performance.now();
    const originalDuration = originalEnd - originalStart;

    // Measure performance for the modified method
    const modifiedStart = performance.now();
    await modifiedSeedBlockData(toBlock2, fromBlock2);
    const modifiedEnd = performance.now();
    const modifiedDuration = modifiedEnd - modifiedStart;

    // Expect the modified method to be faster than the original method
    expect(modifiedDuration).to.be.lessThan(originalDuration);

    // Log the results for verification
    console.log(`Original Method Duration: ${originalDuration.toFixed(2)}ms`);
    console.log(`Modified Method Duration: ${modifiedDuration.toFixed(2)}ms`);
  });
});

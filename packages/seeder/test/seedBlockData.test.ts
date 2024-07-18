import 'dotenv/config';
import { expect } from 'chai';
import { getPrismaClient } from '../src/utils/prismaClient';
import { seedBlockData as originalSeedBlockData,seedBlockDataV2 as modifiedSeedBlockData  } from '../src/blocks/seedBlockData';
import { getViemClient } from '../src/utils/viemClient';

describe('Seed Block Data', async function () {
  this.timeout(100000)

  it('should seed block data using original method and measure performance', async function () {
    
	const fromBlock1 = 1250000n
	const toBlock1 = 1250200n

    const fromBlock2 = 1260000n
	const toBlock2 = 1260200n
    const prismaClient = getPrismaClient()

    console.time('Original Method');
    await originalSeedBlockData(toBlock1,fromBlock1);
    console.timeEnd('Original Method');
    // const originalData = await prismaClient.evm_BlockData.findMany();

    // console.log(originalData)

    // // Cleanup database before next test
    // await prismaClient.evm_BlockData.deleteMany({});
    // await cleanupDatabase(getPrismaClient);

    console.time('Modified Method');
    await modifiedSeedBlockData(toBlock2,fromBlock2);
    console.timeEnd('Modified Method');
    // const modifiedData = await prismaClient.evm_BlockData.findMany();
    // console.log(modifiedData)
    // expect(originalData).to.deep.equal(modifiedData);
  });
});

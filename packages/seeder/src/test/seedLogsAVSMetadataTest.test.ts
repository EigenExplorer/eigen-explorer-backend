import { describe, it, expect, vi, beforeAll } from 'vitest'
import { seedLogsAVSMetadata } from '../events/seedLogsAVSMetadata'
import prisma from '../utils/__mocks__/prisma' // Importing the mock Prisma client
import { getEigenContracts } from '../data/address'
import { fetchLastSyncBlock, getBlockDataFromDb, loopThroughBlocks, bulkUpdateDbTransactions } from '../utils/seeder'
import { getViemClient } from '../utils/viemClient'

// Mocking dependencies
vi.mock('../utils/prismaClient', () => ({
  getPrismaClient: () => prisma,
}))

vi.mock('../utils/viemClient', () => ({
  getViemClient: vi.fn(),
}))

vi.mock('../utils/seeder', () => ({
  fetchLastSyncBlock: vi.fn(),
  loopThroughBlocks: vi.fn(),
  bulkUpdateDbTransactions: vi.fn(),
  getBlockDataFromDb: vi.fn(),
}))

vi.mock('../data/address', () => ({
  getEigenContracts: vi.fn(),
}))

describe('seedLogsAVSMetadata', () => {
  let viemClientMock: any

  beforeAll(() => {
    // Setting up mock for Viem client
    viemClientMock = {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(1367755)),
      getLogs: vi.fn().mockResolvedValue([
        {
          eventName: 'AVSMetadataURIUpdated',
          args: {
            avs: '0xd36b6E5eEe8311d7Bffb2f3Bb33301A1AB7De101',
            metadataURI: 'https://raw.githubusercontent.com/zuoyuan-arpa/BLS-TSS-Network/eigenlayer-node-update/metadata-avs.json',
          },
          address: '0x055733000064333caddbc92763c58bf0192ffebf',
          topics: [
            '0xa89c1dc243d8908a96dd84944bcc97d6bc6ac00dd78e20621576be6a3c943713',
            '0x000000000000000000000000d36b6e5eee8311d7bffb2f3bb33301a1ab7de101',
          ],
          data: '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006768747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f7a756f7975616e2d617270612f424c532d5453532d4e6574776f726b2f656967656e6c617965722d6e6f64652d7570646174652f6d657461646174612d6176732e6a736f6e00000000000000000000000000000000000000000000000000',
          blockNumber: 1367754n,
          transactionHash: '0xb1fa2c093994052c39762ef6c9e94c64667656eea5177c9a63e7be5a4358176b',
          transactionIndex: 3,
          blockHash: '0x4c051069a53337caaad92abfa9043ae6303ca6b505995d8e8c606ff9eff9c5bf',
          logIndex: 0,
          removed: false,
        },
      ]),
    }
    vi.mocked(getViemClient).mockReturnValue(viemClientMock)

    // Mocking utility functions
    vi.mocked(fetchLastSyncBlock).mockResolvedValue(BigInt(1367753))
    vi.mocked(loopThroughBlocks).mockImplementation(async (fromBlock, toBlock, callback) => {
      await callback(fromBlock, toBlock)
      return toBlock // Returning the `toBlock` as a `bigint` value
    })
    vi.mocked(getBlockDataFromDb).mockResolvedValue(new Map([[BigInt(1367754), new Date(0)]]))

    vi.mocked(bulkUpdateDbTransactions).mockResolvedValue(undefined) // Mock bulkUpdateDbTransactions

    // Mocking getEigenContracts to return the expected address
    vi.mocked(getEigenContracts).mockReturnValue({
      AVSDirectory: '0x135dda560e946695d6f155dacafc6f1f25c1f5af',
    })
  })

  it('should seed logs and update the database with correct data', async () => {
    // Mocking Prisma createMany method for this specific test
    prisma.eventLogs_AVSMetadataURIUpdated.createMany.mockResolvedValue({
      count: 1,
    })

    await seedLogsAVSMetadata()

    // Verify that createMany was called with the correct data
    expect(prisma.eventLogs_AVSMetadataURIUpdated.createMany).toHaveBeenCalledWith({
      data: [
        {
          address: '0x055733000064333caddbc92763c58bf0192ffebf',
          transactionHash: '0xb1fa2c093994052c39762ef6c9e94c64667656eea5177c9a63e7be5a4358176b',
          transactionIndex: 0,
          blockNumber: 1367754n,
          blockHash: '0x4c051069a53337caaad92abfa9043ae6303ca6b505995d8e8c606ff9eff9c5bf',
          blockTime: new Date(0),
          avs: '0xd36b6E5eEe8311d7Bffb2f3Bb33301A1AB7De101',
          metadataURI: 'https://raw.githubusercontent.com/zuoyuan-arpa/BLS-TSS-Network/eigenlayer-node-update/metadata-avs.json',
        },
      ],
      skipDuplicates: true,
    })

    // Verify that bulkUpdateDbTransactions was called with the correct transactions
    expect(bulkUpdateDbTransactions).toHaveBeenCalledWith(
      expect.any(Array), // array of transactions
      '[Logs] AVS Metadata from: 1367753 to: 1367755 size: 1'
    )
  })
})

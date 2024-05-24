import z from '../';

export const WithdrawalListQuerySchema = z.object({
    stakerAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
        .optional()
        .describe('The address of the staker')
        .openapi({ example: '0x74ede5f75247fbdb9266d2b3a7be63b3db7611dd' }),
    delegatedTo: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
        .optional()
        .describe('The address of the operator to which the stake is delegated')
        .openapi({ example: '0x5accc90436492f24e6af278569691e2c942a676d' }),
    strategyAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
        .optional()
        .describe('The contract address of the restaking strategy')
        .openapi({ example: '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6' }),
    status: z
        .enum(['queued', 'queued_withdrawable', 'completed'])
        .optional()
        .describe('The status of the withdrawal')
        .openapi({ example: 'queued' }),
});

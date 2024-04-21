import z from '../';

const EthereumAddress = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

export const StrategyNameSchema = z.enum([
    'WETH',
    'cbETH',
    'stETH',
    'rETH',
    'ETHx',
    'ankrETH',
    'oETH',
    'osETH',
    'swETH',
    'wBETH',
    'sfrxETH',
    'lsETH',
    'mETH',
]);

const StrategyContractSchema = z.object({
    strategyContract: EthereumAddress,
    tokenContract: EthereumAddress,
});

const StrategiesSchema = z.record(StrategyNameSchema, StrategyContractSchema);

const EigenContractAddressSchema = z.object({
    AVSDirectory: EthereumAddress,
    DelegationManager: EthereumAddress,
    Slasher: EthereumAddress,
    StrategyManager: EthereumAddress,
    EigenPodManager: EthereumAddress,
    Strategies: StrategiesSchema,
});

export type StrategyName = z.infer<typeof StrategyNameSchema>;
export type StrategyContract = z.infer<typeof StrategyContractSchema>;
export type EigenContractAddress = z.infer<typeof EigenContractAddressSchema>;

import z from '../'
import { EthereumAddressSchema } from './base/ethereumAddress'

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
	'mETH'
])

const StrategyContractSchema = z.object({
	strategyContract: EthereumAddressSchema,
	tokenContract: EthereumAddressSchema
})

const StrategiesSchema = z.record(StrategyNameSchema, StrategyContractSchema)

const EigenContractAddressSchema = z.object({
	AVSDirectory: EthereumAddressSchema,
	DelegationManager: EthereumAddressSchema,
	Slasher: EthereumAddressSchema,
	StrategyManager: EthereumAddressSchema,
	EigenPodManager: EthereumAddressSchema,
	Strategies: StrategiesSchema
})

export type StrategyName = z.infer<typeof StrategyNameSchema>
export type StrategyContract = z.infer<typeof StrategyContractSchema>
export type EigenContractAddress = z.infer<typeof EigenContractAddressSchema>

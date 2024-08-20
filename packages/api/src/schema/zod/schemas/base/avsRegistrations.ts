import z from '../..'
import { EthereumAddressSchema } from './ethereumAddress'

export const AvsRegistrationSchema = z.object({
	avsAddress: EthereumAddressSchema.describe(
		'AVS service manager contract address'
	).openapi({
		example: '0x870679e138bcdf293b7ff14dd44b70fc97e12fc0'
	}),
	isActive: z
		.boolean()
		.describe(
			'The operator is currently participating if active, otherwise they were previously active but no longer are'
		)
		.openapi({ example: false })
})

import z from '../../../../api/src/schema/zod'
import { AvsMetaDataSchema } from '../../../../api/src/schema/zod/schemas/base/avsMetaData'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

export const CuratedMetadataSchema = AvsMetaDataSchema.extend({
	avsAddress: EthereumAddressSchema.describe('AVS service manager contract address').openapi({
		example: '0x35f4f28a8d3ff20eed10e087e8f96ea2641e6aa1'
	}),
	tags: z
		.array(z.string())
		.describe('Tags to describe the AVS')
		.openapi({ example: ['Example tag 1', 'Example tag 2'] }),
	isVisible: z
		.boolean()
		.describe('Indicates if AVS visibility is allowed')
		.openapi({ example: false }),
	isVerified: z
		.boolean()
		.describe('Indicates if the AVS has been verified by the EigenExplorer team')
		.openapi({ example: false })
})

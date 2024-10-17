import { ZodOpenApiOperationObject } from 'zod-openapi'
import { openApiErrorResponses } from '../../apiResponseSchema/base/errorResponses'
import z from '../../../../api/src/schema/zod'
import { HistoricalCountSchema } from '../../../../api/src/schema/zod/schemas/historicalCountQuery'
import { HistoricalIndividualStrategyTvlResponseSchema } from '../../apiResponseSchema/metrics/tvlResponse'
import { EthereumAddressSchema } from '../../../../api/src/schema/zod/schemas/base/ethereumAddress'

const HistoricalIndividualStrategyTvlCombinedResponseSchema = z.object({
	data: z.array(HistoricalIndividualStrategyTvlResponseSchema)
})

const RestakingStrategyAddressParam = z.object({
	address: EthereumAddressSchema.describe('The address of the strategy').openapi({
		example: '0x54945180dB7943c0ed0FEE7EdaB2Bd24620256bc'
	})
})

export const getHistoricalTvlRestaking: ZodOpenApiOperationObject = {
	operationId: 'getHistoricalTvlRestaking',
	summary: 'Retrieve historical TVL data by strategy address',
	description:
		'Returns the historical total value locked (TVL) data over specified timestamp values in a specific LST strategy.',
	tags: ['Metrics'],
	requestParams: {
		query: HistoricalCountSchema,
		path: RestakingStrategyAddressParam
	},
	responses: {
		'200': {
			description:
				'The historical data of TVL for the specified strategy over specified timestamp values.',
			content: {
				'application/json': {
					schema: HistoricalIndividualStrategyTvlCombinedResponseSchema
				}
			}
		},
		...openApiErrorResponses
	}
}

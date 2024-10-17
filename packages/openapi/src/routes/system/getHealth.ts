import { ZodOpenApiOperationObject } from 'zod-openapi'
import z from '../../../../api/src/schema/zod'

const HealthResponseSchema = z.object({
	status: z.string().describe('The status of the API server').openapi({ example: 'ok' })
})

export const getHealth: ZodOpenApiOperationObject = {
	operationId: 'getHealth',
	summary: 'Retrieve API server status',
	description: 'Returns API server status.',
	tags: ['System'],
	requestParams: {},
	responses: {
		'200': {
			description: 'The API server status.',
			content: {
				'application/json': {
					schema: HealthResponseSchema
				}
			}
		}
	}
}

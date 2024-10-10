import z from '../../../../api/src/schema/zod'

export const PaginationMetaResponsesSchema = z.object({
	total: z.number().describe('Total number of records in the database').openapi({ example: 30 }),
	skip: z.number().describe('The number of skiped records for this query').openapi({ example: 0 }),
	take: z
		.number()
		.describe('The number of records returned for this query')
		.openapi({ example: 12 })
})

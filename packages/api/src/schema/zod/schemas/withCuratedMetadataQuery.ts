import z from '..'

export const WithCuratedMetadata = z.object({
	withCuratedMetadata: z
		.enum(['true', 'false'])
		.default('false')
		.describe('Toggle whether the route should send curated metadata')
		.transform((val) => val === 'true')
		.openapi({ example: 'false' })
})

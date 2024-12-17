import z from '..'

export const RequestHeadersSchema = z
	.object({
		'x-api-token': z.string().optional()
	})
	.transform((headers) => {
		const token = Object.keys(headers).find((key) => key.toLowerCase() === 'x-api-token')
		return token
			? {
					'X-API-Token': headers[token]
			  }
			: {}
	})

export const RegisterUserBodySchema = z.object({
	signature: z.string().startsWith('0x').length(132),
	nonce: z.string().startsWith('0x').length(66)
})

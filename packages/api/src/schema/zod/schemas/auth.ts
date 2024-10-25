import z from '..'

export const RequestHeadersSchema = z
	.object({
		'x-api-token': z.string()
	})
	.transform((headers) => {
		const token =
			Object.keys(headers).find((key) => key.toLowerCase() === 'x-api-token') ?? 'x-api-token'
		return {
			'X-API-Token': headers[token]
		}
	})

import z from './../../api/src/schema/zod'

export const AuthHeaderSchema = z.object({
	'X-API-Token': z.string().describe('API Token for authentication')
})

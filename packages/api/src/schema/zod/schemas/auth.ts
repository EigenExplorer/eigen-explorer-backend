import z from '../'

export const GenerateTokenSchema = z.object({
	id: z.string().describe('Unique identifier of user'),
})

export const RevokeTokenSchema = z.object({
	id: z.string().describe('Unique identifier of user'),
	token: z.string().describe('API token to be revoked')
})

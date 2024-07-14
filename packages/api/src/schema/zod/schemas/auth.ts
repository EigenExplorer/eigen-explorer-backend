import z from '../'

export const GenerateTokenSchema = z.object({
	id: z
		.string()
		.optional()
		.default('0')
		.describe('Unique identifier of user'),
	credits: z
		.number()
		.optional()
		.default(0)
		.describe('Number of additional credits to award to the user')
})

export const RemoveTokenSchema = z.object({
	id: z
		.string()
		.describe('Unique identifier of user'),
	token: z
		.string()
		.describe('API token to be removed')
})

export const UpdateCreditsSchema = z.object({
	id: z
		.string()
		.describe('Unique identifier of user'),
	credits: z
		.number()
		.describe('Number of additional credits to award to the user')
})
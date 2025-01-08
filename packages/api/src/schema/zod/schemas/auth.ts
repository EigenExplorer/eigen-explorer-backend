import z from '..'

export const RegisterUserBodySchema = z.object({
	signature: z.string().startsWith('0x').length(132),
	nonce: z.string().startsWith('0x').length(66)
})

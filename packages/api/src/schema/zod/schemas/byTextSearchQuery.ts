import z from '../'

export const ByTextSearchQuerySchema = z.object({
	byTextSearch: z
		.string()
		.optional()
		.refine(
			(value) => {
				if (!value) return true
				return /^[a-zA-Z0-9\s.,?-]+$/.test(value)
			},
			{
				message:
					"Only letters, numbers, spaces, and basic punctuation marks ['.' | ',' | '?' | '-'] are allowed."
			}
		)
		.refine(
			(value) => {
				if (!value) return true
				return !/<[^>]*>/.test(value)
			},
			{ message: 'HTML tags are not allowed.' }
		)
		.transform((value) => {
			if (!value) return value
			return value.trim().split(/\s+/).join('&') // Replace spaces with '&' for tsquery compatibility
		})
		.describe('Case-insensitive search query')
		.openapi({ example: 'blockless' })
})

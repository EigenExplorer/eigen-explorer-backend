import z from '../'

export const SearchByTextQuerySchema = z
	.object({
		searchMode: z
			.enum(['contains', 'startsWith'])
			.optional()
			.default('contains')
			.describe('Search mode')
			.openapi({ example: 'contains' }),
		searchByText: z
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
			.openapi({ example: 'eigen' })
	})
	.refine(
		(data) => {
			if (!data.searchByText) return true

			if (data.searchMode === 'contains') {
				return data.searchByText.length >= 3 && data.searchByText.length <= 64
			}

			return true
		},
		{
			message: 'Search query must be between 3 and 64 characters long.'
		}
	)

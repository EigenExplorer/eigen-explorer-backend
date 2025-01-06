export function constructEfUrl(index: number) {
	const functionSelector = process.env.SUPABASE_EF_SELECTORS?.split(':')[index - 1] || null
	return functionSelector
		? // biome-ignore lint/style/noNonNullAssertion: <explanation>
		  `https://${process.env.SUPABASE_PROJECT_REF!}.supabase.co/functions/v1/${functionSelector}`
		: null
}

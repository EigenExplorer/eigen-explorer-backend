import 'dotenv/config'

/**
 * Returns URL of an Edge Function deployed on the dev-portal DB, given its function selector index
 * 1 -> Fetching all users
 * 2 -> Fetching access level for a given API token
 * 3 -> Posting updates on # of new requests for a set of API tokens
 *
 * @param index
 * @returns
 */
export function constructEfUrl(index: number) {
	const projectRef = process.env.SUPABASE_PROJECT_REF || null
	const functionSelector = process.env.SUPABASE_EF_SELECTORS?.split(':')[index - 1] || null

	return projectRef && functionSelector
		? `https://${projectRef}.supabase.co/functions/v1/${functionSelector}`
		: null
}

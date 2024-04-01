export interface EntityMetadata {
	name: string
	description: string
	discord: string
	logo: string
	telegram: string
	website: string
	x: string
}

export function isValidMetadataUrl(url: string): boolean {
	// Define the regular expression pattern for HTTPS URLs
	const httpsUrlPattern =
		/^https:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/

	// Test the URL against the pattern
	return httpsUrlPattern.test(url)
}

export function validateMetadata(metadata: string): EntityMetadata | null {
	try {
		const data = JSON.parse(metadata)

		if (
			!(typeof data.name === 'string' && typeof data.description === 'string')
		) {
			return null
		}

		return {
			name: data.name,
			website: data.website,
			description: data.description,
			logo: data.logo,
			x: data.x || data.twitter,
			discord: data.discord,
			telegram: data.telegram
		}
	} catch {}

	return null
}

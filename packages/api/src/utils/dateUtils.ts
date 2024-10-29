const maxDuration = 30 * 24 * 60 * 60 * 1000 // 30 days
const defaultDuration = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Validates that the given time range doesn't exceed the max allowed duration.
 *
 * @param startAt
 * @param endAt
 * @returns
 */
export const validateDateRange = (startAt: string, endAt: string) => {
	const start = new Date(startAt)
	const end = new Date(endAt || new Date())
	const durationMs = end.getTime() - start.getTime()
	return durationMs <= maxDuration
}

/**
 * Utility to get default dates if not provided.
 * Default to last 7 days
 *
 * @param startAt
 * @param endAt
 * @returns
 */
export const getValidatedDates = (startAt?: string, endAt?: string) => {
	const now = new Date()

	if (!startAt && !endAt) {
		return {
			startAt: new Date(now.getTime() - defaultDuration).toISOString(),
			endAt: null
		}
	}

	if (startAt && !endAt) {
		const start = new Date(startAt)
		return {
			startAt,
			endAt: new Date(Math.min(start.getTime() + defaultDuration, now.getTime())).toISOString()
		}
	}

	if (!startAt && endAt) {
		const end = new Date(endAt)
		return {
			startAt: new Date(end.getTime() - defaultDuration).toISOString(),
			endAt
		}
	}

	return { startAt, endAt }
}

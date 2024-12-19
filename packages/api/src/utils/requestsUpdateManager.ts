import { requestsStore } from './authCache'

interface UpdatePayload {
	key: string
	data: {
		apiToken: string
		requests: number
	}
	timestamp: string
}

interface QueueState {
	current: Map<string, UpdatePayload>
	next: Map<string, UpdatePayload>
}

/**
 * Manages DB updates for API Token request count
 *
 */
class RequestsUpdateManager {
	private updateInterval = 60_000 // 1 minute
	private updateTimeout: NodeJS.Timeout | null = null
	private queue: QueueState = {
		current: new Map(),
		next: new Map()
	}

	constructor(private readonly supabaseUrl: string, private readonly supabaseKey: string) {}

	async queueUpdate(apiToken: string): Promise<void> {
		const requestKey = `apiToken:${apiToken}:newRequests`
		const newRequests = Number(requestsStore.get(requestKey)) || 0

		if (newRequests === 0) return

		const payload: UpdatePayload = {
			key: apiToken,
			data: {
				apiToken,
				requests: newRequests
			},
			timestamp: new Date().toISOString()
		}

		if (!this.updateTimeout) {
			this.queue.current.set(apiToken, payload)
			this.scheduleUpdate()
		} else {
			if (this.queue.current.size === 0) {
				this.queue.next.set(apiToken, payload)
			} else {
				this.queue.current.set(apiToken, payload)
			}
		}
	}

	private scheduleUpdate(): void {
		if (this.updateTimeout) {
			return
		}

		this.updateTimeout = setTimeout(() => {
			this.performUpdate()
		}, this.updateInterval)
	}

	private async performUpdate(): Promise<void> {
		try {
			if (this.queue.current.size > 0) {
				const updatePayload = Array.from(this.queue.current.values())
				await this.httpClient(this.supabaseUrl, updatePayload)

				// Clear processed requests from cache
				for (const payload of updatePayload) {
					const requestKey = `apiToken:${payload.data.apiToken}:newRequests`
					requestsStore.del(requestKey)
				}

				console.log(`[Data] User requests sync: size: ${updatePayload.length}`)
			}
		} catch (error) {
			console.error('[Data] Update failed:', error)
		} finally {
			this.updateTimeout = null
			this.queue.current = this.queue.next
			this.queue.next = new Map()

			if (this.queue.current.size > 0) {
				this.scheduleUpdate()
			}
		}
	}

	private async httpClient(url: string, data: UpdatePayload[]): Promise<void> {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.supabaseKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data.map((payload) => payload.data))
		})

		if (!response.ok) {
			throw new Error('Failed to post updates')
		}
	}
}

const updateManager = new RequestsUpdateManager(
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	process.env.SUPABASE_POST_REQUESTS_URL!,
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Call this function after a request is received & API Token is identified
 *
 * @returns
 */
export function triggerUserRequestsSync(apiToken: string) {
	return updateManager.queueUpdate(apiToken)
}

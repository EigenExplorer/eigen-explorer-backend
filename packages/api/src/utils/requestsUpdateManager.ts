import { requestsStore } from './authCache'
import { refreshAuthStore } from './authMiddleware'
import { constructEfUrl } from './edgeFunctions'

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
 * Manages DB updates for API Token request count, utilizing `requestsStore`
 *
 */
class RequestsUpdateManager {
	private updateInterval = 60_000 // 1 minute
	private edgeFunctionIndex = 3
	private updateTimeout: NodeJS.Timeout | null = null
	private queue: QueueState = {
		current: new Map(),
		next: new Map()
	}

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
				const functionUrl = constructEfUrl(this.edgeFunctionIndex)
				const updatePayload = Array.from(this.queue.current.values())

				if (!functionUrl) {
					throw new Error('Invalid function selector')
				}

				await this.httpClient(functionUrl, updatePayload)

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
			refreshAuthStore()
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
				Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data.map((payload) => payload.data))
		})

		if (!response.ok) {
			throw new Error('Failed to post updates')
		}
	}
}

const updateManager = new RequestsUpdateManager()

/**
 * Called at the end of every authenticated request, after `requestsStore` is incremented with the route cost
 *
 * @returns
 */
export function triggerUserRequestsSync(apiToken: string) {
	return updateManager.queueUpdate(apiToken)
}

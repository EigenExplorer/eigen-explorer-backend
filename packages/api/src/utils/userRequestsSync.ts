import type { User } from './authMiddleware'
import { requestsStore } from './authCache'
import cron from 'node-cron'

/**
 * Send updates to DB with number of requests in the past hour per user
 * Cron job runs at the start of every hour
 *
 */
export function startUserRequestsSync() {
	cron.schedule('0 * * * *', async () => {
		console.time('[Data] User requests sync')

		let skip = 0
		const take = 10_000

		while (true) {
			try {
				const getResponse = await fetch(
					`${process.env.SUPABASE_FETCH_ALL_USERS_URL}?skip=${skip}&take=${take}`,
					{
						method: 'GET',
						headers: {
							Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
							'Content-Type': 'application/json'
						}
					}
				)

				if (!getResponse.ok) {
					throw new Error()
				}

				const users = (await getResponse.json()).data as User[]

				if (users.length === 0) break

				const updateList: { id: string; requests: number }[] = []
				for (const user of users) {
					const apiTokens = user.apiTokens ?? []
					let totalNewRequests = 0

					for (const apiToken of apiTokens) {
						const key = `apiToken:${apiToken}:newRequests`
						const newRequests = Number(requestsStore.get(key)) || 0
						if (newRequests > 0) totalNewRequests += newRequests
						requestsStore.del(key)
					}

					if (totalNewRequests > 0) {
						updateList.push({
							id: user.id,
							requests: user.requests + totalNewRequests
						})
					}
				}

				if (updateList.length > 0) {
					const postResponse = await fetch(`${process.env.SUPABASE_POST_REQUESTS_URL}`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(updateList)
					})

					if (!postResponse.ok) {
						throw new Error()
					}

					console.log(`[Data] User requests sync: size: ${updateList.length}`)
				}
			} catch {}

			skip += take
		}

		requestsStore.flushAll() // Delete remaining (stale) keys once full sync is successful
		console.timeEnd('[Data] User requests sync')
	})
}

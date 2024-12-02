import type { User } from './authMiddleware'
import { requestStore } from './authCache'
import cron from 'node-cron'

/**
 * Send updates to DB with number of requests in the past hour per user
 * Cron jon runs at the start of every hour
 *
 */
export function startUserRequestsSync() {
	cron.schedule('0 * * * *', async () => {
		console.log('[Data] User requests sync started')

		try {
			let skip = 0
			const take = 10_000

			while (true) {
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
						totalNewRequests += Number(requestStore.get(key))
						requestStore.del(key)
					}
					updateList.push({
						id: user.id,
						requests: user.requests + totalNewRequests
					})
				}

				const postResponse = await fetch(`${process.env.SUPABASE_POST_USER_REQUESTS_URL}`, {
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
				skip += take
			}

			requestStore.flushAll() // Delete stale keys once full sync is successful
		} catch {}
	})

	console.log('[Data] User requests sync complete')
}

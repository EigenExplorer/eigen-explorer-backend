import { refreshAuthStore } from './authMiddleware'
import NodeCache from 'node-cache'

/**
 * Init cache that stores `accessLevel` & `accountRestricted` per api token.
 * On server boot, load it up with all auth data from db.
 *
 */
export const authStore = new NodeCache({ stdTTL: 7 * 24 * 60 * 60 }) // 1 week
refreshAuthStore()

/**
 * Init cache that collects `newRequests` per api token.
 *
 */
export const requestsStore = new NodeCache({ stdTTL: 7 * 24 * 60 * 60 }) // 1 week

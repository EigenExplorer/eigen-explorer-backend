import { refreshAuthStore } from './authMiddleware'
import NodeCache from 'node-cache'

/**
 * Init cache that stores `accessLevel` & `accountRestricted` per API token
 * On server boot, load it up with all auth data from db
 *
 */
export const authStore = new NodeCache({ stdTTL: 60 * 60 }) // 1 hour
refreshAuthStore()

/**
 * Init cache that collects `newRequests` per API token
 *
 */
export const requestsStore = new NodeCache({ stdTTL: 24 * 60 * 60 }) // 1 day

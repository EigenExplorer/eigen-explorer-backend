import NodeCache from 'node-cache'

/**
 * Cache that stores `accessLevel` & `accountRestricted` per API token
 *
 */
export const authStore = new NodeCache({ stdTTL: 60 * 60 }) // 1 hour

/**
 * Cache that collects `newRequests` per API token
 *
 */
export const requestsStore = new NodeCache({ stdTTL: 24 * 60 * 60 }) // 1 day

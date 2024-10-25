import { refreshStore } from './authMiddleware'
import NodeCache from 'node-cache'

/**
 * Init auth store on server boot and load up with all auth data
 *
 */
const authStore = new NodeCache({ stdTTL: 7 * 24 * 60 * 60 }) // 1 week
refreshStore()

export default authStore

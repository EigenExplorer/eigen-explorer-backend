import { refreshStore } from './authMiddleware'
import NodeCache from 'node-cache'

const authStore = new NodeCache({ stdTTL: 7 * 24 * 60 * 60 }) // 1 week
refreshStore()

export default authStore

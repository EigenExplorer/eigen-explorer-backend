import 'dotenv/config'
import Redis from 'ioredis'

const url = process.env.REDIS_URL || ''
const client = new Redis(url)

export default client
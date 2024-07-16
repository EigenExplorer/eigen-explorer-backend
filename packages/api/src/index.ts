import 'dotenv/config'
import './utils/bigint'
import express, { type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import redis from './utils/redisClient'
import helmet from 'helmet'
import cors from 'cors'
import apiRouter from './routes'
import { apiLimiter, authenticateAndCheckCredits } from './user/auth'
import { fetchAndSyncUserData } from './user/data'
import {
	EigenExplorerApiError,
	handleAndReturnErrorResponse
} from './schema/errors'

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3002

function delay(seconds: number) {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

const app = express()

// App settings
app.use(helmet())
app.use(cors({ origin: '*' }))
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// Routes
app.use('/', authenticateAndCheckCredits, apiLimiter, apiRouter)

app.get('/favicon.ico', (req, res) => res.sendStatus(204))

// Catch 404 and forward to error handler
app.use((req, res) => {
	const err = new EigenExplorerApiError({
		code: 'not_found',
		message: 'The requested route does not exist.'
	})
	handleAndReturnErrorResponse(req, res, err)
})

// Error handler
app.use((err: Error, req: Request, res: Response) => {
	// Set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get('env') === 'development' ? err : {}

	// Render the error page
	res.status(500)
	res.render('error')
})

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})

async function userDataLoop() {
	while (true) {
		try {
			await fetchAndSyncUserData()
		} catch (error) {
			console.log('Failed to fetch and sync user data at:', Date.now())
			console.log(error)
		}
		await delay(5)
	}
}

userDataLoop()

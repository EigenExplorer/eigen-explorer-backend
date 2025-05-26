import 'dotenv/config'
import './utils/bigint'

import express, { type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import apiRouter from './routes'
import { requestsStore } from './utils/authCache'
import { triggerUserRequestsSync } from './utils/requestsUpdateManager'
import { EigenExplorerApiError, handleAndReturnErrorResponse } from './schema/errors'
import { isAuthRequired, refreshAuthStore } from './utils/authMiddleware'

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3002

// Create express app
const app = express()

// App settings
app.use(helmet())
app.use(cors({ origin: '*' }))
app.use(logger('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// Route cost increment in cache for caller's API Token
if (isAuthRequired()) {
	refreshAuthStore()
	app.use((req, res, next) => {
		res.on('finish', () => {
			try {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					const apiToken = req.header('X-API-Token')
					if (apiToken) {
						const key = `apiToken:${apiToken}:newRequests`
						const currentCalls: number = requestsStore.get(key) || 0
						const cost = req.cost || 1
						requestsStore.set(key, currentCalls + cost)
						triggerUserRequestsSync(apiToken)
					}
				}
			} catch {}
		})
		next()
	})
}

// Routes
app.use('/', apiRouter)

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

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})

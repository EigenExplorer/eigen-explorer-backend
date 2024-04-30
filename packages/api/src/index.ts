import 'dotenv/config';

import express, { type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import helmet from 'helmet';
import apiRouter from './routes';
import {
    EigenExplorerApiError,
    handleAndReturnErrorResponse,
} from './schema/errors';

const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3002;

// Create express app
const app = express();

// App settings
app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use('/', apiRouter);

// catch 404 and forward to error handler
app.use((req, res) => {
    const err = new EigenExplorerApiError({
        code: 'not_found',
        message: 'The requested route does not exist.',
    });
    handleAndReturnErrorResponse(req, res, err);
});

// error handler
app.use((err: Error, req: Request, res: Response) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(500);
    res.render('error');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

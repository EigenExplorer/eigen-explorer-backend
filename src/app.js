import createError from 'http-errors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import helmet from 'helmet';

// Import routes
import indexRouter from './api/index.js';

// File path and dir path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create express app
const app = express();

// App settings
app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Routes
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res) => {
    res.status(404).json({ message: "Sorry, this route doesn't exist." });
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

export default app;

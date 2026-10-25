import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from './config/env.js';
import passport from './config/passport.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import resourcesRouter from './routes/resources.js';
import { ApiError } from './utils/ApiError.js';
import { errorHandler } from './middleware/error.js';
import bookingsRouter from './routes/bookings.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const clientOrigins = config.CLIENT_URL.includes(',')
  ? config.CLIENT_URL.split(',').map((url) => url.trim())
  : config.CLIENT_URL;

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(
      new ApiError(
        'RATE_LIMITED',
        429,
        options.message || 'Too many requests, please try again later.'
      )
    );
  },
});

app.use(globalRateLimiter);
app.use(passport.initialize());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/bookings', bookingsRouter);

// Unknown routes handler
app.use((req, res, next) => {
  next(new ApiError('NOT_FOUND', 404, `Route ${req.method} ${req.originalUrl} not found`));
});

// Central error handler
app.use(errorHandler);

export default app;

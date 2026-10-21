import { config } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const currentEnv = config?.NODE_ENV || process.env.NODE_ENV || 'development';
  const isProduction = currentEnv === 'production';

  let code = err.code;
  let message = err.message;
  let details = err.details;

  if (err.name === 'ZodError' || err.issues) {
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues || err.errors;
  } else if (!code) {
    code = statusCode >= 500 ? 'INTERNAL' : statusCode === 400 ? 'VALIDATION_ERROR' : 'ERROR';
    if (statusCode >= 500 && isProduction) {
      message = 'Internal server error';
    }
  }

  const errorPayload = {
    code,
    message: message || 'An error occurred',
  };

  if (details !== undefined) {
    errorPayload.details = details;
  }

  if (!isProduction && currentEnv === 'development' && err.stack) {
    errorPayload.stack = err.stack;
  }

  res.status(statusCode).json({ error: errorPayload });
}

export default errorHandler;

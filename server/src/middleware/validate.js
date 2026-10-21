import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  if (!schema) {
    return next();
  }

  // Support plain object with body/query/params: { body: zSchema, query: zSchema, params: zSchema }
  if (typeof schema === 'object' && !(schema._def || typeof schema.safeParse === 'function')) {
    const targets = ['body', 'query', 'params'];
    for (const target of targets) {
      if (schema[target] && typeof schema[target].safeParse === 'function') {
        const result = schema[target].safeParse(req[target]);
        if (!result.success) {
          const details = result.error.issues || result.error.errors || [];
          throw new ApiError('VALIDATION_ERROR', 400, 'Validation failed', details);
        }
        req[target] = result.data;
      }
    }
    return next();
  }

  // Support Zod schema with body/query/params shape: z.object({ body: ..., query: ... })
  if (schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params)) {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      const details = result.error.issues || result.error.errors || [];
      throw new ApiError('VALIDATION_ERROR', 400, 'Validation failed', details);
    }
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query;
    if (result.data.params !== undefined) req.params = result.data.params;
    return next();
  }

  // Support direct Zod schema (defaults to validating req.body)
  if (typeof schema.safeParse === 'function') {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues || result.error.errors || [];
      throw new ApiError('VALIDATION_ERROR', 400, 'Validation failed', details);
    }
    req.body = result.data;
    return next();
  }

  next();
};

export default validate;

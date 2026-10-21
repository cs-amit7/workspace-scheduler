import { jest } from '@jest/globals';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { ApiError } from '../../src/utils/ApiError.js';

describe('validate middleware', () => {
  const userSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  it('throws ApiError VALIDATION_ERROR (400) with details when body is invalid', () => {
    const middleware = validate({ body: userSchema });
    const req = { body: { name: '', email: 'not-an-email' } };
    const res = {};
    const next = jest.fn();

    expect(() => middleware(req, res, next)).toThrow(ApiError);

    try {
      middleware(req, res, next);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.statusCode).toBe(400);
      expect(Array.isArray(err.details)).toBe(true);
      expect(err.details.length).toBeGreaterThan(0);
    }
  });

  it('calls next() when body is valid', () => {
    const middleware = validate({ body: userSchema });
    const req = { body: { name: 'Alice', email: 'alice@example.com' } };
    const res = {};
    const next = jest.fn();

    expect(() => middleware(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ name: 'Alice', email: 'alice@example.com' });
  });

  it('validates query and params schemas when provided', () => {
    const querySchema = z.object({ page: z.coerce.number() });
    const paramsSchema = z.object({ id: z.string().min(1) });
    const middleware = validate({ query: querySchema, params: paramsSchema });

    const req = { query: { page: '2' }, params: { id: 'res-123' } };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(2);
  });
});

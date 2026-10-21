import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import app from '../../src/app.js';
import { validate } from '../../src/middleware/validate.js';
import { errorHandler } from '../../src/middleware/error.js';

describe('App & Error Handling Integration', () => {
  it('returns 404 in the error envelope for an unknown route', async () => {
    const res = await request(app).get('/api/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('/api/unknown-endpoint'),
      },
    });
  });

  it('returns 400 VALIDATION_ERROR with details when invalid body passes through validate middleware in express', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post(
      '/api/test-validate',
      validate({
        body: z.object({
          title: z.string().min(3),
        }),
      }),
      (req, res) => res.status(200).json({ data: req.body })
    );
    testApp.use(errorHandler);

    const res = await request(testApp).post('/api/test-validate').send({ title: 'ab' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('keeps /api/health returning status ok and uptime', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
  });

  it('hides stack traces when NODE_ENV is production', async () => {
    const prodApp = express();
    prodApp.use(() => {
      throw new Error('Production error');
    });
    prodApp.use(errorHandler);

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(prodApp).get('/test-error');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL');
      expect(res.body.error.stack).toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

import request from 'supertest';
import passport from 'passport';
import { setupTestDB, clearTestDB, teardownTestDB } from '../helpers/db.js';
import app from '../../src/app.js';
import authRouter from '../../src/routes/auth.js';
import { auth } from '../../src/middleware/auth.js';
import { requireRole } from '../../src/middleware/requireRole.js';
import { config } from '../../src/config/env.js';
import { User } from '../../src/models/User.js';

// Register a test route on authRouter to verify requireRole middleware
authRouter.get('/admin-only-test', auth, requireRole('admin'), (req, res) => {
  res.status(200).json({ data: { message: 'admin ok' } });
});

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/auth/demo', () => {
    it('sets the token cookie and returns a token in data for user role', async () => {
      const res = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user).toMatchObject({
        email: 'demo-user@workspace.local',
        name: 'Demo User',
        role: 'user',
        isDemo: true,
      });

      // Verify Set-Cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toMatch(/HttpOnly/i);
      expect(tokenCookie).toMatch(/SameSite=Lax/i);
    });

    it('defaults to role user when no body is provided', async () => {
      const res = await request(app).post('/api/auth/demo').send();

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('user');
    });

    it('returns 400 VALIDATION_ERROR when invalid role is provided', async () => {
      const res = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'invalid_role' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('demo admin works when ENABLE_DEMO_ADMIN is true', async () => {
      const original = config.ENABLE_DEMO_ADMIN;
      config.ENABLE_DEMO_ADMIN = true;

      const res = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        email: 'demo-admin@workspace.local',
        role: 'admin',
        isDemo: true,
      });

      config.ENABLE_DEMO_ADMIN = original;
    });

    it('demo admin returns 403 when ENABLE_DEMO_ADMIN is false', async () => {
      const original = config.ENABLE_DEMO_ADMIN;
      config.ENABLE_DEMO_ADMIN = false;

      const res = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN');

      config.ENABLE_DEMO_ADMIN = original;
    });
  });

  describe('GET /api/auth/me', () => {
    it('works via token cookie', async () => {
      // 1. Log in via demo
      const loginRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      const cookie = loginRes.headers['set-cookie'];

      // 2. Fetch /me using the cookie
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data).toMatchObject({
        email: 'demo-user@workspace.local',
        name: 'Demo User',
        role: 'user',
      });
      expect(meRes.body.data._id).toBeDefined();
    });

    it('works via Bearer header', async () => {
      // 1. Log in via demo
      const loginRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      const token = loginRes.body.data.token;

      // 2. Fetch /me using Authorization header
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data).toMatchObject({
        email: 'demo-user@workspace.local',
        role: 'user',
      });
    });

    it('/me without token returns 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('a tampered token returns 401', async () => {
      // Tampered Bearer header
      const headerRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(headerRes.status).toBe(401);
      expect(headerRes.body.error).toBeDefined();
      expect(headerRes.body.error.code).toBe('UNAUTHENTICATED');

      // Tampered cookie
      const cookieRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=corrupted_jwt_token_value']);

      expect(cookieRes.status).toBe(401);
      expect(cookieRes.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 401 if user from valid token no longer exists in DB', async () => {
      const loginRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      const token = loginRes.body.data.token;
      // Delete user from DB
      await User.deleteMany({});

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('requireRole middleware', () => {
    it('non-admin hitting a requireRole("admin") route returns 403', async () => {
      const userRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      const token = userRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/admin-only-test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('admin hitting a requireRole("admin") route returns 200', async () => {
      const adminRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'admin' });

      const token = adminRes.body.data.token;

      const res = await request(app)
        .get('/api/auth/admin-only-test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('admin ok');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logout clears the cookie and returns 204', async () => {
      const loginRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(204);

      // Verify Set-Cookie clears the token
      const cookies = logoutRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      // Clearing cookie sets expired date or empty value
      expect(tokenCookie).toMatch(/(Expires=Thu, 01 Jan 1970|Max-Age=0|token=;)/);
    });

    it('returns 401 when attempting to logout without authentication', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Google OAuth Flow & State verification', () => {
    it('GET /api/auth/google sets oauth_state cookie and redirects to Google', async () => {
      const res = await request(app).get('/api/auth/google');

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/accounts\.google\.com/);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const stateCookie = cookies.find((c) => c.startsWith('oauth_state='));
      expect(stateCookie).toBeDefined();
      expect(stateCookie).toMatch(/HttpOnly/i);
    });

    it('callback with a wrong state is rejected', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback?state=wrong-state')
        .set('Cookie', ['oauth_state=expected-state']);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('callback with missing state is rejected', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback')
        .set('Cookie', ['oauth_state=expected-state']);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('callback with matching state calls mocked strategy, sets token cookie, and redirects to CLIENT_URL', async () => {
      const testUser = await User.create({
        email: 'google-test@workspace.local',
        name: 'Google Test User',
        role: 'user',
        googleId: 'test-google-uid-999',
      });

      // Mock strategy without making any external calls to Google
      class MockGoogleStrategy extends passport.Strategy {
        constructor() {
          super();
          this.name = 'google';
        }
        authenticate() {
          this.success(testUser, {});
        }
      }

      // Temporarily register mock strategy
      passport.use(new MockGoogleStrategy());

      const stateVal = 'test-secret-oauth-state-12345';

      const res = await request(app)
        .get(`/api/auth/google/callback?state=${stateVal}`)
        .set('Cookie', [`oauth_state=${stateVal}`]);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(config.CLIENT_URL);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toMatch(/HttpOnly/i);
    });
  });

  describe('Rate Limiting', () => {
    it('returns 429 RATE_LIMITED when exceeding 20 requests per 15 minutes', async () => {
      let rateLimitedRes;
      for (let i = 0; i < 30; i++) {
        const res = await request(app)
          .post('/api/auth/demo')
          .set('x-test-rate-limit', 'true')
          .send({ role: 'user' });

        if (res.status === 429) {
          rateLimitedRes = res;
          break;
        }
      }

      expect(rateLimitedRes).toBeDefined();
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error).toBeDefined();
      expect(rateLimitedRes.body.error.code).toBe('RATE_LIMITED');
    });

    it('returns 200 for 30 consecutive GET /api/auth/me requests with a valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/demo')
        .send({ role: 'user' });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.data.token;

      for (let i = 0; i < 30; i++) {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .set('x-test-rate-limit', 'true');

        expect(res.status).toBe(200);
      }
    });
  });
});


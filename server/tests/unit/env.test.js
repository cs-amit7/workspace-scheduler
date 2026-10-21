import { parseEnv } from '../../src/config/env.js';

describe('parseEnv', () => {
  const validEnv = {
    PORT: '5000',
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/workspace_scheduler_test',
    JWT_SECRET: 'dummy_super_secret_jwt_key_at_least_32_bytes_long',
    GOOGLE_CLIENT_ID: 'dummy-google-client-id',
    GOOGLE_CLIENT_SECRET: 'dummy-google-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:5000/api/auth/google/callback',
    CLIENT_URL: 'http://localhost:5173',
    ADMIN_EMAILS: 'admin@example.com',
    ENABLE_DEMO_ADMIN: 'true',
  };

  it('throws when a required variable is missing', () => {
    expect(() => parseEnv({})).toThrow(/Environment validation failed/);
  });

  it('throws specifically identifying missing MONGODB_URI', () => {
    const withoutMongo = { ...validEnv };
    delete withoutMongo.MONGODB_URI;
    expect(() => parseEnv(withoutMongo)).toThrow(/MONGODB_URI/);
  });

  it('throws specifically identifying missing JWT_SECRET', () => {
    const withoutJwt = { ...validEnv };
    delete withoutJwt.JWT_SECRET;
    expect(() => parseEnv(withoutJwt)).toThrow(/JWT_SECRET/);
  });

  it('parses valid environment variables correctly', () => {
    const config = parseEnv(validEnv);
    expect(config.PORT).toBe(5000);
    expect(config.NODE_ENV).toBe('test');
    expect(config.MONGODB_URI).toBe('mongodb://localhost:27017/workspace_scheduler_test');
    expect(config.ENABLE_DEMO_ADMIN).toBe(true);
  });

  it('defaults ENABLE_DEMO_ADMIN to false when omitted', () => {
    const withoutDemoAdmin = { ...validEnv };
    delete withoutDemoAdmin.ENABLE_DEMO_ADMIN;
    const config = parseEnv(withoutDemoAdmin);
    expect(config.ENABLE_DEMO_ADMIN).toBe(false);
  });

  it('defaults PORT to 5000 when omitted', () => {
    const withoutPort = { ...validEnv };
    delete withoutPort.PORT;
    const config = parseEnv(withoutPort);
    expect(config.PORT).toBe(5000);
  });
});

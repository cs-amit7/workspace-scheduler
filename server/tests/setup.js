process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5000';
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/workspace_scheduler_test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test_dummy_jwt_secret_must_be_at_least_32_characters';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS || 'admin@example.com';
process.env.ENABLE_DEMO_ADMIN = process.env.ENABLE_DEMO_ADMIN || 'true';
process.env.BOOKING_RATE_LIMIT_MAX = process.env.BOOKING_RATE_LIMIT_MAX || '1000';
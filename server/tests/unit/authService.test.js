import { setupTestDB, clearTestDB, teardownTestDB } from '../helpers/db.js';
import {
  upsertGoogleUser,
  upsertDemoUser,
  signToken,
  verifyToken,
  isAdminEmail,
} from '../../src/services/authService.js';
import { User } from '../../src/models/User.js';
import { config } from '../../src/config/env.js';

describe('authService', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('isAdminEmail', () => {
    it('returns true if email is in ADMIN_EMAILS (case-insensitive)', () => {
      const original = config.ADMIN_EMAILS;
      config.ADMIN_EMAILS = 'admin@example.com, superuser@workspace.local';

      expect(isAdminEmail('admin@example.com')).toBe(true);
      expect(isAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true);
      expect(isAdminEmail('superuser@workspace.local')).toBe(true);
      expect(isAdminEmail('regular@example.com')).toBe(false);

      config.ADMIN_EMAILS = original;
    });

    it('returns false when ADMIN_EMAILS is empty or email is missing', () => {
      const original = config.ADMIN_EMAILS;
      config.ADMIN_EMAILS = '';

      expect(isAdminEmail('admin@example.com')).toBe(false);
      expect(isAdminEmail('')).toBe(false);
      expect(isAdminEmail(null)).toBe(false);

      config.ADMIN_EMAILS = original;
    });
  });

  describe('upsertGoogleUser', () => {
    it('creates a new user with role "user" when email is not in ADMIN_EMAILS', async () => {
      const profile = {
        id: 'google-id-123',
        displayName: 'John Doe',
        emails: [{ value: 'johndoe@example.com', verified: true }],
        photos: [{ value: 'https://example.com/avatar.jpg' }],
      };

      const user = await upsertGoogleUser(profile);

      expect(user).toBeDefined();
      expect(user.googleId).toBe('google-id-123');
      expect(user.email).toBe('johndoe@example.com');
      expect(user.name).toBe('John Doe');
      expect(user.avatar).toBe('https://example.com/avatar.jpg');
      expect(user.role).toBe('user');
      expect(user.isDemo).toBe(false);
    });

    it('makes ADMIN_EMAILS users admin on new user creation', async () => {
      const original = config.ADMIN_EMAILS;
      config.ADMIN_EMAILS = 'lead-admin@workspace.com';

      const profile = {
        id: 'google-id-admin',
        displayName: 'Lead Admin',
        emails: [{ value: 'lead-admin@workspace.com' }],
      };

      const user = await upsertGoogleUser(profile);

      expect(user.role).toBe('admin');
      expect(user.email).toBe('lead-admin@workspace.com');

      config.ADMIN_EMAILS = original;
    });

    it('makes ADMIN_EMAILS users admin and does not create duplicates on repeat login', async () => {
      const original = config.ADMIN_EMAILS;
      config.ADMIN_EMAILS = 'repeat-admin@workspace.com';

      const profile = {
        id: 'google-id-repeat',
        displayName: 'Repeat User',
        emails: [{ value: 'repeat-admin@workspace.com' }],
        photos: [{ value: 'https://example.com/photo1.jpg' }],
      };

      // First login
      const firstUser = await upsertGoogleUser(profile);
      expect(firstUser.role).toBe('admin');

      // Second login with updated name/photo
      const updatedProfile = {
        ...profile,
        displayName: 'Repeat User Updated',
        photos: [{ value: 'https://example.com/photo2.jpg' }],
      };
      const secondUser = await upsertGoogleUser(updatedProfile);

      expect(secondUser._id.toString()).toBe(firstUser._id.toString());
      expect(secondUser.name).toBe('Repeat User Updated');
      expect(secondUser.avatar).toBe('https://example.com/photo2.jpg');
      expect(secondUser.role).toBe('admin');

      const count = await User.countDocuments();
      expect(count).toBe(1);

      config.ADMIN_EMAILS = original;
    });

    it('links googleId if user already exists by email and does not duplicate', async () => {
      // Pre-existing user created without googleId
      const existing = await User.create({
        email: 'preexisting@example.com',
        name: 'Preexisting Name',
        role: 'user',
      });

      const profile = {
        id: 'new-google-id',
        displayName: 'Updated Google Name',
        emails: [{ value: 'preexisting@example.com' }],
      };

      const user = await upsertGoogleUser(profile);

      expect(user._id.toString()).toBe(existing._id.toString());
      expect(user.googleId).toBe('new-google-id');
      expect(user.email).toBe('preexisting@example.com');

      const count = await User.countDocuments({ email: 'preexisting@example.com' });
      expect(count).toBe(1);
    });
  });

  describe('signToken and verifyToken', () => {
    it('signs a valid JWT with sub and role and 7-day expiry', async () => {
      const fakeUser = {
        _id: '665f12345678901234567890',
        role: 'admin',
      };

      const token = signToken(fakeUser);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.sub).toBe('665f12345678901234567890');
      expect(decoded.role).toBe('admin');
      // ~7 days = 604800 seconds
      expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('upsertDemoUser', () => {
    it('upserts a demo user with role "user"', async () => {
      const user = await upsertDemoUser({ role: 'user' });

      expect(user.email).toBe('demo-user@workspace.local');
      expect(user.name).toBe('Demo User');
      expect(user.role).toBe('user');
      expect(user.isDemo).toBe(true);

      // Repeat upsert returns same user
      const repeat = await upsertDemoUser({ role: 'user' });
      expect(repeat._id.toString()).toBe(user._id.toString());
      expect(await User.countDocuments({ email: 'demo-user@workspace.local' })).toBe(1);
    });

    it('upserts demo admin when ENABLE_DEMO_ADMIN is true', async () => {
      const original = config.ENABLE_DEMO_ADMIN;
      config.ENABLE_DEMO_ADMIN = true;

      const user = await upsertDemoUser({ role: 'admin' });
      expect(user.email).toBe('demo-admin@workspace.local');
      expect(user.name).toBe('Demo Admin');
      expect(user.role).toBe('admin');
      expect(user.isDemo).toBe(true);

      config.ENABLE_DEMO_ADMIN = original;
    });

    it('throws 403 FORBIDDEN when role "admin" is requested but ENABLE_DEMO_ADMIN is false', async () => {
      const original = config.ENABLE_DEMO_ADMIN;
      config.ENABLE_DEMO_ADMIN = false;

      await expect(upsertDemoUser({ role: 'admin' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: 403,
      });

      config.ENABLE_DEMO_ADMIN = original;
    });
  });
});

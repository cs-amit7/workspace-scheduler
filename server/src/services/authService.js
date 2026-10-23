import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const TOKEN_COOKIE_NAME = 'token';
export const OAUTH_STATE_COOKIE_NAME = 'oauth_state';

export function getTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };
}

export function getOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    maxAge: 5 * 60 * 1000, // 5 minutes in ms
  };
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
  };
}

export function isAdminEmail(email) {
  if (!email || !config.ADMIN_EMAILS) return false;
  const adminEmails = config.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.trim().toLowerCase());
}

export function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
  };
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

export function formatUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || '',
    role: user.role,
    isDemo: Boolean(user.isDemo),
  };
}

export async function upsertGoogleUser(profile) {
  if (!profile) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Profile data is required');
  }

  const googleId = profile.id;
  const rawEmail =
    (Array.isArray(profile.emails) && profile.emails[0]?.value) ||
    profile.email ||
    '';
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Google account email not found');
  }

  const name =
    profile.displayName ||
    (profile.name && `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim()) ||
    profile.name ||
    email.split('@')[0] ||
    'Google User';

  const avatar =
    (Array.isArray(profile.photos) && profile.photos[0]?.value) ||
    profile.avatar ||
    '';

  const role = isAdminEmail(email) ? 'admin' : 'user';

  let user = null;
  if (googleId) {
    user = await User.findOne({ googleId });
  }
  if (!user && email) {
    user = await User.findOne({ email });
  }

  if (user) {
    if (googleId && !user.googleId) user.googleId = googleId;
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    user.role = role;
    await user.save();
  } else {
    user = await User.create({
      googleId,
      name,
      email,
      avatar,
      role,
      isDemo: false,
    });
  }

  return user;
}

export async function upsertDemoUser({ role = 'user' } = {}) {
  const isAdmin = role === 'admin';

  if (isAdmin && !config.ENABLE_DEMO_ADMIN) {
    throw new ApiError('FORBIDDEN', 403, 'Demo admin login is disabled');
  }

  const email = isAdmin ? 'demo-admin@workspace.local' : 'demo-user@workspace.local';
  const name = isAdmin ? 'Demo Admin' : 'Demo User';

  let user = await User.findOne({ email });
  if (user) {
    user.name = name;
    user.role = isAdmin ? 'admin' : 'user';
    user.isDemo = true;
    await user.save();
  } else {
    user = await User.create({
      name,
      email,
      role: isAdmin ? 'admin' : 'user',
      isDemo: true,
      avatar: '',
    });
  }

  return user;
}

export default {
  TOKEN_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  getTokenCookieOptions,
  getOAuthStateCookieOptions,
  getClearCookieOptions,
  isAdminEmail,
  signToken,
  verifyToken,
  formatUserResponse,
  upsertGoogleUser,
  upsertDemoUser,
};

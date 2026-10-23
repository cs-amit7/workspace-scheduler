import crypto from 'crypto';
import passport from '../config/passport.js';
import config from '../config/env.js';
import authService, {
  TOKEN_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  getTokenCookieOptions,
  getOAuthStateCookieOptions,
  getClearCookieOptions,
} from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

export function googleAuth(req, res, next) {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    session: false,
  })(req, res, next);
}

export function googleCallback(req, res, next) {
  const { state } = req.query;
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE_NAME];
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, getClearCookieOptions());

  if (!state || !cookieState || state !== cookieState) {
    return next(new ApiError('VALIDATION_ERROR', 400, 'Invalid OAuth state'));
  }

  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return next(new ApiError('UNAUTHENTICATED', 401, info?.message || 'Authentication failed'));
    }

    try {
      const token = authService.signToken(user);
      res.cookie(TOKEN_COOKIE_NAME, token, getTokenCookieOptions());
      return res.redirect(config.CLIENT_URL);
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
}

export async function demoLogin(req, res, next) {
  try {
    const { role = 'user' } = req.body || {};
    const user = await authService.upsertDemoUser({ role });
    const token = authService.signToken(user);
    res.cookie(TOKEN_COOKIE_NAME, token, getTokenCookieOptions());

    return res.status(200).json({
      data: {
        user: authService.formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function getMe(req, res) {
  return res.status(200).json({
    data: authService.formatUserResponse(req.user),
  });
}

export function logout(req, res) {
  res.clearCookie(TOKEN_COOKIE_NAME, getClearCookieOptions());
  return res.status(204).send();
}

export default {
  googleAuth,
  googleCallback,
  demoLogin,
  getMe,
  logout,
};

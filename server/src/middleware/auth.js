import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken, TOKEN_COOKIE_NAME } from '../services/authService.js';

export async function auth(req, res, next) {
  try {
    let token = req.cookies?.[TOKEN_COOKIE_NAME];

    if (!token && req.headers?.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1].trim();
      }
    }

    if (!token) {
      throw new ApiError('UNAUTHENTICATED', 401, 'Authentication token required');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw new ApiError('UNAUTHENTICATED', 401, 'Invalid or expired token');
    }

    if (!decoded || !decoded.sub) {
      throw new ApiError('UNAUTHENTICATED', 401, 'Invalid token payload');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new ApiError('UNAUTHENTICATED', 401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export default auth;

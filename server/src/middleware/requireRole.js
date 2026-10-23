import { ApiError } from '../utils/ApiError.js';

export function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('UNAUTHENTICATED', 401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError('FORBIDDEN', 403, 'Forbidden: insufficient role permissions'));
    }

    next();
  };
}

export default requireRole;

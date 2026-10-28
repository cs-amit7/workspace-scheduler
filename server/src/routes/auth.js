import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';
import validate from '../middleware/validate.js';
import auth from '../middleware/auth.js';
import { demoLoginSchema } from '../validators/auth.js';
import {
  googleAuth,
  googleCallback,
  demoLogin,
  getMe,
  logout,
} from '../controllers/authController.js';

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true',
  handler: (req, res, next, options) => {
    next(
      new ApiError(
        'RATE_LIMITED',
        429,
        options.message || 'Too many authentication attempts, please try again later.'
      )
    );
  },
});

router.get('/google', authRateLimiter, googleAuth);
router.get('/google/callback', authRateLimiter, googleCallback);
router.post('/demo', authRateLimiter, validate(demoLoginSchema), demoLogin);
router.get('/me', auth, getMe);
router.post('/logout', auth, logout);

export default router;

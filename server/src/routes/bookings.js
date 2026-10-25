import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import {
    createBookingSchema,
    listMineSchema,
    listAllSchema,
    bookingIdParamSchema,
} from '../validators/bookings.js';
import {
    createBooking,
    listMyBookings,
    listAllBookings,
    cancelBooking,
} from '../controllers/bookingController.js';

const router = Router();

// 30 booking attempts per 15 minutes per IP. The limit can be raised in tests.
const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.BOOKING_RATE_LIMIT_MAX) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError('RATE_LIMITED', 429, 'Too many booking requests, please try again later.'));
    },
});

router.use(auth);

router.post('/', createLimiter, validate(createBookingSchema), createBooking);
router.get('/me', validate(listMineSchema), listMyBookings);
router.get('/', requireRole('admin'), validate(listAllSchema), listAllBookings);
router.delete('/:id', validate(bookingIdParamSchema), cancelBooking);

export default router;

import { Booking } from '../models/Booking.js';
import { Resource } from '../models/Resource.js';
import { ApiError } from '../utils/ApiError.js';
import { isAligned, expandSlots } from '../utils/slots.js';
import { now } from '../utils/time.js';

const SLOT_MS = 30 * 60 * 1000;
const MAX_DURATION_MS = 4 * 60 * 60 * 1000;
const MAX_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;
const DUPLICATE_KEY_ERROR = 11000;

function badRequest(message) {
    return new ApiError('VALIDATION_ERROR', 400, message);
}

// Business rules from PRD section 7. Order matters: cheap checks first.
function parseWindow(startInput, endInput) {
    const start = new Date(startInput);
    const end = new Date(endInput);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw badRequest('start and end must be valid dates');
    }
    if (start >= end) throw badRequest('end must be after start');
    if (!isAligned(start) || !isAligned(end)) {
        throw badRequest('start and end must be on a 30-minute boundary (:00 or :30 UTC)');
    }

    const duration = end.getTime() - start.getTime();
    if (duration < SLOT_MS) throw badRequest('Minimum booking is 30 minutes');
    if (duration > MAX_DURATION_MS) throw badRequest('Maximum booking is 4 hours');

    const current = now();
    if (start.getTime() <= current.getTime()) throw badRequest('Bookings cannot start in the past');
    if (start.getTime() - current.getTime() > MAX_AHEAD_MS) {
        throw badRequest('Bookings can be made at most 30 days ahead');
    }

    return { start, end };
}

// Internal "slots" array is never exposed to clients.
function toDTO(booking) {
    const dto = typeof booking.toObject === 'function' ? booking.toObject() : { ...booking };
    delete dto.slots;
    delete dto.__v;
    return dto;
}

// Only used to build a helpful error message AFTER the database has already
// rejected the insert. It is NOT the safety guarantee.
async function buildSlotTakenError(resourceId, { start, end }) {
    const conflict = await Booking.findOne({
        resource: resourceId,
        status: 'confirmed',
        start: { $lt: end },
        end: { $gt: start },
    })
        .sort({ start: 1 })
        .select('start end')
        .lean();

    const details = conflict ? { conflict: { start: conflict.start, end: conflict.end } } : undefined;
    return new ApiError(
        'SLOT_TAKEN',
        409,
        'That time is no longer available. Please pick another slot.',
        details
    );
}

export async function create(user, { resourceId, start, end }) {
    const window = parseWindow(start, end);

    const resource = await Resource.findById(resourceId);
    if (!resource) throw new ApiError('NOT_FOUND', 404, 'Resource not found');
    if (!resource.isActive) {
        throw new ApiError('INVALID_STATE', 409, 'This resource is disabled and cannot be booked');
    }

    try {
        // The unique partial index on { resource, slots } (confirmed only) is what
        // makes double-booking impossible. We simply try to insert.
        const booking = await Booking.create({
            resource: resource._id,
            user: user._id,
            start: window.start,
            end: window.end,
            slots: expandSlots(window.start, window.end),
            status: 'confirmed',
        });
        return toDTO(booking);
    } catch (err) {
        if (err?.code === DUPLICATE_KEY_ERROR) {
            throw await buildSlotTakenError(resource._id, window);
        }
        throw err;
    }
}

export async function listMine(userId, { when = 'upcoming', page = 1, limit = 12 } = {}) {
    const filter = { user: userId };
    let sort = { start: -1 };

    if (when === 'upcoming') {
        // Only live bookings: a cancelled booking is history, not "upcoming".
        filter.end = { $gt: now() };
        filter.status = 'confirmed';
        sort = { start: 1 };
    } else if (when === 'past') {
        // History = bookings that have ended, plus anything cancelled.
        filter.$or = [{ end: { $lte: now() } }, { status: 'cancelled' }];
    }

    const [items, total] = await Promise.all([
        Booking.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('resource', 'name type location')
            .lean(),
        Booking.countDocuments(filter),
    ]);

    return { items: items.map(toDTO), total };
}

export async function listAll({ resourceId, userId, status, from, to, page = 1, limit = 12 } = {}) {
    const filter = {};
    if (resourceId) filter.resource = resourceId;
    if (userId) filter.user = userId;
    if (status) filter.status = status;

    if (from && to && new Date(from) >= new Date(to)) throw badRequest('from must be before to');
    // A booking overlaps [from, to) when it ends after "from" and starts before "to".
    if (from) filter.end = { $gt: new Date(from) };
    if (to) filter.start = { $lt: new Date(to) };

    const [items, total] = await Promise.all([
        Booking.find(filter)
            .sort({ start: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('resource', 'name type')
            .populate('user', 'name email')
            .lean(),
        Booking.countDocuments(filter),
    ]);

    return { items: items.map(toDTO), total };
}

export async function cancel(user, bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new ApiError('NOT_FOUND', 404, 'Booking not found');

    const isOwner = String(booking.user) === String(user._id);
    if (!isOwner && user.role !== 'admin') {
        throw new ApiError('FORBIDDEN', 403, 'You can only cancel your own bookings');
    }
    if (booking.status === 'cancelled') {
        throw new ApiError('INVALID_STATE', 409, 'Booking is already cancelled');
    }
    if (booking.end.getTime() <= now().getTime()) {
        throw new ApiError('INVALID_STATE', 409, 'This booking has already ended');
    }

    // Atomic update: only a still-confirmed booking can be cancelled. Emptying
    // "slots" removes it from the unique index, so the time becomes bookable again.
    const cancelled = await Booking.findOneAndUpdate(
        { _id: booking._id, status: 'confirmed' },
        { $set: { status: 'cancelled', cancelledAt: now(), slots: [] } },
        { new: true }
    );
    if (!cancelled) throw new ApiError('INVALID_STATE', 409, 'Booking is already cancelled');

    return toDTO(cancelled);
}

export default { create, listMine, listAll, cancel };
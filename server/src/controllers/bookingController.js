import bookingService from '../services/bookingService.js';

function pagination(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
    return { page, limit };
}

export async function createBooking(req, res, next) {
    try {
        const booking = await bookingService.create(req.user, req.body);
        return res.status(201).json({ data: booking });
    } catch (err) {
        next(err);
    }
}

export async function listMyBookings(req, res, next) {
    try {
        const { page, limit } = pagination(req.query);
        const when = req.query.when || 'upcoming';
        const { items, total } = await bookingService.listMine(req.user._id, { when, page, limit });
        return res.status(200).json({ data: items, meta: { page, limit, total } });
    } catch (err) {
        next(err);
    }
}

export async function listAllBookings(req, res, next) {
    try {
        const { page, limit } = pagination(req.query);
        const { resourceId, userId, status, from, to } = req.query;
        const { items, total } = await bookingService.listAll({
            resourceId,
            userId,
            status,
            from,
            to,
            page,
            limit,
        });
        return res.status(200).json({ data: items, meta: { page, limit, total } });
    } catch (err) {
        next(err);
    }
}

export async function cancelBooking(req, res, next) {
    try {
        const booking = await bookingService.cancel(req.user, req.params.id);
        return res.status(200).json({ data: booking });
    } catch (err) {
        next(err);
    }
}

export default { createBooking, listMyBookings, listAllBookings, cancelBooking };
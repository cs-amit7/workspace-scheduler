import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResourceDetail from './ResourceDetail.jsx';
import { useResource } from '../hooks/useResource.js';
import { useAvailability } from '../hooks/useAvailability.js';
import { createBooking } from '../api/bookings.js';
import { localToUtcIso } from '../utils/time.js';

vi.mock('../hooks/useResource.js', () => ({ useResource: vi.fn() }));
vi.mock('../hooks/useAvailability.js', () => ({ useAvailability: vi.fn() }));
vi.mock('../api/bookings.js', () => ({ createBooking: vi.fn() }));
// Cells start at 07:00 in 30-minute steps, so indexes 6..7 are 10:00-11:00 local.
vi.mock('../components/SlotGrid.jsx', () => ({
    default: ({ onSelect }) => (
        <button type="button" onClick={() => onSelect({ startIndex: 6, endIndex: 7 })}>
            pick 10:00-11:00
        </button>
    ),
}));

const RESOURCE = {
    _id: 'r1',
    name: 'Orion Meeting Room',
    type: 'room',
    capacity: 8,
    location: 'Floor 2',
    amenities: ['WiFi'],
};

const DATE = '2030-01-15';

function apiError(code, status, message) {
    return Object.assign(new Error(message), { code, status });
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={[`/resources/r1?date=${DATE}`]}>
            <Routes>
                <Route path="/resources/:id" element={<ResourceDetail />} />
            </Routes>
        </MemoryRouter>
    );
}

const pickButton = () => screen.getByRole('button', { name: /pick 10:00-11:00/i });
const confirmButton = () => screen.getByRole('button', { name: /confirm booking|booking\.\.\./i });

describe('ResourceDetail booking panel', () => {
    let reloadAvail;

    beforeEach(() => {
        vi.clearAllMocks();
        reloadAvail = vi.fn();
        useResource.mockReturnValue({ data: RESOURCE, loading: false, error: null, reload: vi.fn() });
        useAvailability.mockReturnValue({
            data: { booked: [] },
            loading: false,
            error: null,
            reload: reloadAvail,
        });
    });

    it('keeps Confirm booking disabled until a window is selected', async () => {
        const user = userEvent.setup();
        renderPage();

        expect(confirmButton().disabled).toBe(true);

        await user.click(pickButton());

        expect(confirmButton().disabled).toBe(false);
        expect(screen.getByTestId('selection-summary').textContent).toContain('10:00-11:00');
    });

    it('submits UTC times, shows a confirmation and refreshes availability', async () => {
        const user = userEvent.setup();
        createBooking.mockResolvedValue({ data: { _id: 'b1' } });
        renderPage();

        await user.click(pickButton());
        await user.click(confirmButton());

        await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1));
        expect(createBooking).toHaveBeenCalledWith({
            resourceId: 'r1',
            start: localToUtcIso(DATE, '10:00'),
            end: localToUtcIso(DATE, '11:00'),
        });

        const confirmation = await screen.findByTestId('booking-confirmation');
        expect(confirmation.textContent).toContain('Booked');
        expect(screen.getByRole('link', { name: /view my bookings/i })).toBeTruthy();
        expect(reloadAvail).toHaveBeenCalled();
        expect(screen.queryByTestId('selection-summary')).toBeNull();
    });

    it('handles a 409 conflict: shows a message, clears the selection and refreshes the grid', async () => {
        const user = userEvent.setup();
        createBooking.mockRejectedValue(apiError('SLOT_TAKEN', 409, 'That time is no longer available.'));
        renderPage();

        await user.click(pickButton());
        await user.click(confirmButton());

        const error = await screen.findByTestId('booking-error');
        expect(error.textContent).toMatch(/just booked/i);
        expect(reloadAvail).toHaveBeenCalled();
        expect(screen.queryByTestId('selection-summary')).toBeNull();
        expect(confirmButton().disabled).toBe(true);
    });

    it('shows the server message for other failures and keeps the selection', async () => {
        const user = userEvent.setup();
        createBooking.mockRejectedValue(
            apiError('VALIDATION_ERROR', 400, 'Bookings cannot start in the past')
        );
        renderPage();

        await user.click(pickButton());
        await user.click(confirmButton());

        const error = await screen.findByTestId('booking-error');
        expect(error.textContent).toContain('Bookings cannot start in the past');
        expect(screen.getByTestId('selection-summary')).toBeTruthy();
    });

    it('sends only one request while a booking is in flight', async () => {
        const user = userEvent.setup();
        createBooking.mockReturnValue(new Promise(() => { }));
        renderPage();

        await user.click(pickButton());
        await user.click(confirmButton());

        await waitFor(() => expect(confirmButton().textContent).toMatch(/booking\.\.\./i));
        expect(confirmButton().disabled).toBe(true);

        await user.click(confirmButton());
        expect(createBooking).toHaveBeenCalledTimes(1);
    });
});
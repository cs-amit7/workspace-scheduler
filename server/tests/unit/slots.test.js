import { isAligned, expandSlots } from '../../src/utils/slots.js';

describe('isAligned', () => {
    it('accepts :00 and :30 UTC with no seconds', () => {
        expect(isAligned(new Date('2030-01-01T10:00:00.000Z'))).toBe(true);
        expect(isAligned(new Date('2030-01-01T10:30:00.000Z'))).toBe(true);
    });

    it('rejects other minutes, seconds and milliseconds', () => {
        expect(isAligned(new Date('2030-01-01T10:15:00.000Z'))).toBe(false);
        expect(isAligned(new Date('2030-01-01T10:00:01.000Z'))).toBe(false);
        expect(isAligned(new Date('2030-01-01T10:00:00.500Z'))).toBe(false);
    });

    it('rejects invalid dates and non-dates', () => {
        expect(isAligned(new Date('nope'))).toBe(false);
        expect(isAligned('2030-01-01T10:00:00.000Z')).toBe(false);
    });
});

describe('expandSlots', () => {
    it('returns one slot start per 30 minutes in [start, end)', () => {
        const slots = expandSlots(new Date('2030-01-01T10:00:00.000Z'), new Date('2030-01-01T11:30:00.000Z'));
        expect(slots.map((s) => s.toISOString())).toEqual([
            '2030-01-01T10:00:00.000Z',
            '2030-01-01T10:30:00.000Z',
            '2030-01-01T11:00:00.000Z',
        ]);
    });

    it('returns a single slot for a 30-minute booking', () => {
        const slots = expandSlots(new Date('2030-01-01T10:00:00.000Z'), new Date('2030-01-01T10:30:00.000Z'));
        expect(slots).toHaveLength(1);
    });

    it('returns 8 slots for the 4-hour maximum', () => {
        const slots = expandSlots(new Date('2030-01-01T10:00:00.000Z'), new Date('2030-01-01T14:00:00.000Z'));
        expect(slots).toHaveLength(8);
    });

    it('works across midnight UTC', () => {
        const slots = expandSlots(new Date('2030-01-01T23:30:00.000Z'), new Date('2030-01-02T00:30:00.000Z'));
        expect(slots.map((s) => s.toISOString())).toEqual([
            '2030-01-01T23:30:00.000Z',
            '2030-01-02T00:00:00.000Z',
        ]);
    });

    it('returns Date objects and nothing when start equals end', () => {
        const same = new Date('2030-01-01T10:00:00.000Z');
        expect(expandSlots(same, same)).toEqual([]);
        expect(expandSlots(same, new Date('2030-01-01T10:30:00.000Z'))[0]).toBeInstanceOf(Date);
    });
});
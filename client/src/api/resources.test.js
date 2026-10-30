import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from './client.js';
import { listResources, buildResourceQuery, getResource, getAvailability } from './resources.js';

vi.mock('./client.js', () => ({
  default: vi.fn(),
}));

describe('resources API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildResourceQuery', () => {
    it('omits undefined, null and empty string values', () => {
      const query = buildResourceQuery({
        type: '',
        q: null,
        minCapacity: undefined,
        page: 1,
        limit: 12,
      });

      expect(query).toBe('?page=1&limit=12');
    });

    it('returns empty string when no params or all are empty', () => {
      expect(buildResourceQuery({})).toBe('');
      expect(buildResourceQuery({ a: '', b: null })).toBe('');
    });

    it('builds repeated amenity parameters for array values', () => {
      const query = buildResourceQuery({
        amenity: ['WiFi', 'Projector', 'Whiteboard'],
        type: 'room',
      });

      expect(query).toBe('?amenity=WiFi&amenity=Projector&amenity=Whiteboard&type=room');
    });

    it('normalizes amenities key to amenity in repeated parameters', () => {
      const query = buildResourceQuery({
        amenities: ['WiFi', 'Monitor'],
      });

      expect(query).toBe('?amenity=WiFi&amenity=Monitor');
    });
  });

  describe('listResources', () => {
    it('calls client with correct URL query and passes through AbortSignal', async () => {
      const fakeResponse = {
        data: [{ _id: 'r1', name: 'Orion Room' }],
        meta: { page: 1, limit: 12, total: 1 },
      };
      client.mockResolvedValueOnce(fakeResponse);

      const controller = new AbortController();
      const result = await listResources(
        { page: 2, limit: 12, amenity: ['WiFi', 'TV'] },
        { signal: controller.signal }
      );

      expect(client).toHaveBeenCalledWith(
        '/resources?page=2&limit=12&amenity=WiFi&amenity=TV',
        { signal: controller.signal }
      );
      expect(result).toEqual(fakeResponse);
    });
  });

  describe('getResource', () => {
    it('calls client with resource ID and passes AbortSignal', async () => {
      const fakeResource = { data: { _id: 'res-123', name: 'Orion Room' } };
      client.mockResolvedValueOnce(fakeResource);

      const controller = new AbortController();
      const result = await getResource('res-123', { signal: controller.signal });

      expect(client).toHaveBeenCalledWith('/resources/res-123', {
        signal: controller.signal,
      });
      expect(result).toEqual(fakeResource);
    });
  });

  describe('getAvailability', () => {
    it('calls client with from/to query params and passes AbortSignal', async () => {
      const fakeAvail = {
        data: {
          resourceId: 'res-123',
          from: '2026-10-05T00:00:00.000Z',
          to: '2026-10-06T00:00:00.000Z',
          booked: [{ start: '2026-10-05T04:30:00.000Z', end: '2026-10-05T06:00:00.000Z' }],
        },
      };
      client.mockResolvedValueOnce(fakeAvail);

      const controller = new AbortController();
      const result = await getAvailability(
        'res-123',
        { from: '2026-10-05T00:00:00.000Z', to: '2026-10-06T00:00:00.000Z' },
        { signal: controller.signal }
      );

      expect(client).toHaveBeenCalledWith(
        '/resources/res-123/availability?from=2026-10-05T00%3A00%3A00.000Z&to=2026-10-06T00%3A00%3A00.000Z',
        { signal: controller.signal }
      );
      expect(result).toEqual(fakeAvail);
    });
  });
});

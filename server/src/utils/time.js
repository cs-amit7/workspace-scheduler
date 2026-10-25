/**
 * time.js — thin wrapper around Date so tests can mock the clock.
 *
 * Usage in production code:  import { now } from '../utils/time.js';
 * Usage in tests:            jest.mock('../utils/time.js', () => ({ now: () => new Date('...') }));
 */

export function now() {
  return new Date();
}

export default { now };

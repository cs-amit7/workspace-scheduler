import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clientModule from './client.js';
import { getMe, demoLogin, logout, GOOGLE_LOGIN_URL } from './auth.js';

describe('auth api helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports GOOGLE_LOGIN_URL correctly', () => {
    expect(GOOGLE_LOGIN_URL).toBe('/api/auth/google');
  });

  it('getMe calls client with /auth/me', async () => {
    const spy = vi.spyOn(clientModule, 'default').mockResolvedValueOnce({
      data: { name: 'Demo User' },
    });

    const res = await getMe();
    expect(spy).toHaveBeenCalledWith('/auth/me', {});
    expect(res).toEqual({ data: { name: 'Demo User' } });
  });

  it('demoLogin defaults to role user and sends POST /auth/demo', async () => {
    const spy = vi.spyOn(clientModule, 'default').mockResolvedValueOnce({
      data: { user: { role: 'user' }, token: 'mock-token' },
    });

    await demoLogin();
    expect(spy).toHaveBeenCalledWith('/auth/demo', {
      method: 'POST',
      body: { role: 'user' },
    });
  });

  it('demoLogin accepts custom role override', async () => {
    const spy = vi.spyOn(clientModule, 'default').mockResolvedValueOnce({
      data: { user: { role: 'admin' }, token: 'mock-token' },
    });

    await demoLogin({ role: 'admin' });
    expect(spy).toHaveBeenCalledWith('/auth/demo', {
      method: 'POST',
      body: { role: 'admin' },
    });
  });

  it('logout sends POST /auth/logout', async () => {
    const spy = vi.spyOn(clientModule, 'default').mockResolvedValueOnce(null);

    const res = await logout();
    expect(spy).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
    });
    expect(res).toBeNull();
  });
});

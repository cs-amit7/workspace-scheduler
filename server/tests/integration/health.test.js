import request from 'supertest';
import app from '../../src/app.js';

describe('GET /api/health', () => {
  it('should return 200 with status ok and uptime number', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.uptime).toBe('number');
  });
});

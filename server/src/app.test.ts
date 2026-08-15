import {describe, it, expect} from 'vitest';
import request from 'supertest';
import {createApp} from './app.js';

describe('availability', () => {
  it('uses combined cart points from PostgreSQL', async () => {
    const response = await request(createApp())
      .post('/api/v1/availability/earliest')
      .send({area: 'Salmiya', items: [{slug: 'chocolate-truffle-cake', quantity: 2}]});

    expect(response.status).toBe(200);
    expect(response.body.capacityPoints).toBe(16);
    expect(response.body.earliestSlot).not.toBeNull();
  });
});

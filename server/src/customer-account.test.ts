import {afterAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {createApp} from './app.js';
import {prisma} from './db.js';

const email = 'customer-account-test@example.com';
const password = 'customer-password-123';

afterAll(async () => {
  const user = await prisma.user.findUnique({where: {email}});
  if (user) {
    await prisma.session.deleteMany({where: {userId: user.id}});
    await prisma.wishlistItem.deleteMany({where: {userId: user.id}});
    await prisma.customerAddress.deleteMany({where: {userId: user.id}});
    await prisma.user.delete({where: {id: user.id}});
  }
  await prisma.$disconnect();
});

describe('customer accounts', () => {
  it('registers, stores addresses, and syncs wishlist server-side', async () => {
    const app = createApp();
    const registered = await request(app)
      .post('/api/v1/customer/auth/register')
      .send({name: 'Customer Test', email, password});

    expect(registered.status).toBe(201);
    const cookie = registered.headers['set-cookie'];

    const address = await request(app)
      .post('/api/v1/customer/addresses')
      .set('Cookie', cookie)
      .send({
        label: 'Home',
        governorate: 'Hawalli',
        areaName: 'Salmiya',
        block: '1',
        street: 'Test Street',
        building: '10'
      });
    expect(address.status).toBe(201);

    const wishlist = await request(app)
      .put('/api/v1/customer/wishlist')
      .set('Cookie', cookie)
      .send({slugs: ['chocolate-truffle-cake', 'lotus-cheesecake']});
    expect(wishlist.status).toBe(200);
    expect(wishlist.body.wishlist).toEqual(expect.arrayContaining(['chocolate-truffle-cake', 'lotus-cheesecake']));

    const me = await request(app).get('/api/v1/customer/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.customer).toMatchObject({email});
    expect(me.body.addresses).toHaveLength(1);
    expect(me.body.wishlist).toEqual(expect.arrayContaining(['chocolate-truffle-cake', 'lotus-cheesecake']));
  });

  it('logs back in with the customer password', async () => {
    const login = await request(createApp())
      .post('/api/v1/customer/auth/login')
      .send({email, password});

    expect(login.status).toBe(200);
    expect(login.body.customer).toMatchObject({email});
  });
});

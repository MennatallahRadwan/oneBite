import {afterAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';

const area = 'Jabriya';
const slug = 'cinnamon-roll';

const placed: string[] = [];

afterAll(async () => {
  for (const publicNumber of placed) {
    const order = await prisma.order.findUnique({
      where: {publicNumber},
      include: {reservation: true}
    });
    if (!order?.reservation) continue;

    const {date, points} = order.reservation;
    const [windowStart, windowEnd] = order.deliveryWindow.split('–');
    const deliveryArea = await prisma.deliveryArea.findFirstOrThrow({where: {nameEn: order.areaName}});

    await prisma.$transaction([
      prisma.capacityReservation.delete({where: {orderId: order.id}}),
      prisma.orderItem.deleteMany({where: {orderId: order.id}}),
      prisma.order.delete({where: {id: order.id}}),
      prisma.productionCapacity.update({where: {date}, data: {usedPoints: {decrement: points}}}),
      prisma.deliverySlot.updateMany({
        where: {areaId: deliveryArea.id, date, windowStart, windowEnd},
        data: {reserved: {decrement: 1}}
      })
    ]);
  }
});

const quoteFor = (app: ReturnType<typeof createApp>) =>
  request(app).post('/api/v1/checkout/quote').send({area, items: [{slug, quantity: 1}]});

const orderBody = (quote: {body: {quoteId: string; earliestSlot: unknown}}, name: string) => ({
  quoteId: quote.body.quoteId,
  selectedSlot: quote.body.earliestSlot,
  customer: {name, phone: '+96590000500'},
  address: {governorate: 'Hawalli', area, block: '1', street: 'Test', building: '1'}
});

describe('quote persistence', () => {
  it('survives a restart of the process that issued it', async () => {
    const quote = await quoteFor(createApp());
    expect(quote.status).toBe(200);

    // A second app instance stands in for a restarted or additional server: it
    // shares no memory with the first, only the database.
    const replacement = createApp();
    const response = await request(replacement)
      .post('/api/v1/orders')
      .send(orderBody(quote, 'Restart Customer'));

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    placed.push(response.body.orderNumber);
  });

  it('cannot be spent twice', async () => {
    const app = createApp();
    const quote = await quoteFor(app);
    expect(quote.status).toBe(200);

    const first = await request(app).post('/api/v1/orders').send(orderBody(quote, 'First Claim'));
    expect(first.status).toBe(201);
    placed.push(first.body.orderNumber);

    const second = await request(app).post('/api/v1/orders').send(orderBody(quote, 'Second Claim'));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('STALE_QUOTE');
  });

  it('rejects an expired quote', async () => {
    const app = createApp();
    const quote = await quoteFor(app);
    expect(quote.status).toBe(200);

    await prisma.quote.update({
      where: {id: quote.body.quoteId},
      data: {expiresAt: new Date(Date.now() - 1000)}
    });

    const response = await request(app).post('/api/v1/orders').send(orderBody(quote, 'Late Customer'));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('STALE_QUOTE');
  });
});

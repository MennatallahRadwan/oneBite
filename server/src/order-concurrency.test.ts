import {afterAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';

const app = createApp();
const area = 'Hawally';
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

describe('concurrent checkout', () => {
  it('reserves the same slot from parallel orders without failing', async () => {
    const parallel = 4;

    const quotes = await Promise.all(
      Array.from({length: parallel}, () =>
        request(app)
          .post('/api/v1/checkout/quote')
          .send({area, items: [{slug, quantity: 1}]})
      )
    );
    for (const quote of quotes) expect(quote.status).toBe(200);

    // All four target the same earliest slot, so their Serializable
    // transactions contend on the same production and slot rows.
    const responses = await Promise.all(
      quotes.map((quote, index) =>
        request(app)
          .post('/api/v1/orders')
          .send({
            quoteId: quote.body.quoteId,
            selectedSlot: quote.body.earliestSlot,
            customer: {name: `Parallel Customer ${index}`, phone: `+9659000100${index}`},
            address: {governorate: 'Hawalli', area, block: '1', street: 'Test', building: '1'}
          })
      )
    );

    for (const response of responses) {
      // A write conflict must never surface as an internal error. Either the
      // order is created, or capacity genuinely ran out and it is a 409.
      expect(response.status, JSON.stringify(response.body)).not.toBe(500);
      expect([201, 409]).toContain(response.status);
      if (response.status === 201) placed.push(response.body.orderNumber);
    }

    expect(placed.length).toBeGreaterThan(0);
  });
});

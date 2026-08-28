import {afterAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';

const app = createApp();
const area = 'Salmiya';
const slug = 'chocolate-truffle-cake';
const small = 'seed-chocolate-truffle-cake-six';
const large = 'seed-chocolate-truffle-cake-ten';
const giftBox = 'seed-chocolate-truffle-cake-gift-box';

const placed: string[] = [];

// Orders reserve capacity, so anything this file creates has to hand its
// production points and delivery slot back.
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

const quote = (items: unknown[]) => request(app).post('/api/v1/checkout/quote').send({area, items});

describe('cart options', () => {
  it('prices the base product from its smallest variant', async () => {
    const response = await quote([{slug, quantity: 1, variantId: small}]);

    expect(response.status).toBe(200);
    expect(response.body.subtotalFils).toBe(12000);
    expect(response.body.capacityPoints).toBe(8);
  });

  it('charges a larger variant more and costs more production capacity', async () => {
    const response = await quote([{slug, quantity: 1, variantId: large}]);

    expect(response.status).toBe(200);
    // Base 12000 plus the variant's 2500 surcharge.
    expect(response.body.subtotalFils).toBe(14500);
    // The variant replaces the product's points rather than adding to them.
    expect(response.body.capacityPoints).toBe(12);
  });

  it('adds add-on and cake-text pricing on top of the variant', async () => {
    const response = await quote([
      {slug, quantity: 2, variantId: large, addonIds: [giftBox], cakeText: 'Happy Birthday Noor'}
    ]);

    expect(response.status).toBe(200);
    // (12000 base + 2500 variant + 750 gift box + 500 cake text) x 2.
    expect(response.body.subtotalFils).toBe(31500);
    expect(response.body.items[0].variantName).toBe('Serves 10–12');
    expect(response.body.items[0].addonNames).toEqual(['Gift packaging']);
    expect(response.body.items[0].cakeText).toBe('Happy Birthday Noor');
  });

  it('rejects an option id that does not belong to the product', async () => {
    const response = await quote([{slug: 'caramel-croissant', quantity: 1, variantId: large}]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects cake text longer than the product allows', async () => {
    const response = await quote([{slug, quantity: 1, cakeText: 'x'.repeat(41)}]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects cake text on a product that does not offer it', async () => {
    const response = await quote([{slug: 'caramel-croissant', quantity: 1, cakeText: 'Hello'}]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('snapshots the chosen options onto the order', async () => {
    const quoted = await quote([
      {slug, quantity: 1, variantId: large, addonIds: [giftBox], cakeText: 'Congratulations'}
    ]);
    expect(quoted.status).toBe(200);

    const response = await request(app).post('/api/v1/orders').send({
      quoteId: quoted.body.quoteId,
      selectedSlot: quoted.body.earliestSlot,
      customer: {name: 'Options Customer', phone: '+96590000001'},
      address: {governorate: 'Hawalli', area, block: '2', street: 'Test', building: '3'}
    });
    expect(response.status).toBe(201);
    placed.push(response.body.orderNumber);

    const saved = await prisma.order.findUniqueOrThrow({
      where: {publicNumber: response.body.orderNumber},
      include: {items: true}
    });

    expect(saved.items).toHaveLength(1);
    // 12000 base + 2500 variant + 750 gift box + 500 cake text.
    const [item] = saved.items;
    expect(item.variantName).toBe('Serves 10–12');
    expect(item.cakeText).toBe('Congratulations');
    expect(item.unitPriceFils).toBe(15750);
    expect(item.capacityPoints).toBe(12);
    expect(item.selectedAddons).toEqual([
      {nameEn: 'Gift packaging', nameAr: 'تغليف الهدايا', priceFils: 750}
    ]);
    expect(item.allergens).toEqual(['Gluten', 'Dairy', 'Eggs']);
    expect(saved.subtotalFils).toBe(15750);
    expect(saved.capacityPoints).toBe(12);
  });
});

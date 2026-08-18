import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';
import {removeOwner, signInOwner} from './test-support/owner-session.js';

const app = createApp();
const email = 'admin-operations-test@onebite.local';
const areaName = 'Admin Test Area';
const renamedArea = 'Admin Test Area Renamed';

/**
 * Far outside the seeded 30-day horizon, so nothing here competes with the
 * order tests for the days a real checkout would be offered.
 */
const dayOffset = (offset: number) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
};
const key = (offset: number) => dayOffset(offset).toISOString().slice(0, 10);

const first = key(120);
const last = key(124);

let cookie: string;
let areaId: string;

const authed = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string) =>
  request(app)[method](`/api/v1/owner${path}`).set('Cookie', cookie);

beforeAll(async () => {
  cookie = await signInOwner(app, email);
});

afterAll(async () => {
  const area = await prisma.deliveryArea.findFirst({
    where: {nameEn: {in: [areaName, renamedArea]}}
  });
  if (area) {
    await prisma.deliverySlot.deleteMany({where: {areaId: area.id}});
    await prisma.deliveryArea.delete({where: {id: area.id}});
  }
  await prisma.productionCapacity.deleteMany({
    where: {date: {gte: dayOffset(120), lte: dayOffset(124)}}
  });
  await removeOwner(email);
});

describe('owner delivery areas', () => {
  it('creates an area and offers it on the storefront', async () => {
    const created = await authed('post', '/delivery/areas').send({
      nameEn: areaName,
      nameAr: 'منطقة الاختبار',
      feeFils: 2250
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    areaId = created.body.id;

    const areas = await request(app).get('/api/v1/delivery/areas');
    expect(areas.body.items).toContainEqual(
      expect.objectContaining({nameEn: areaName, feeFils: 2250})
    );
  });

  it('reports a duplicate area name as a conflict', async () => {
    const duplicate = await authed('post', '/delivery/areas').send({
      nameEn: areaName,
      nameAr: 'مكرر',
      feeFils: 1000
    });
    expect(duplicate.status).toBe(409);
  });

  it('takes a deactivated area off the storefront', async () => {
    expect((await authed('patch', `/delivery/areas/${areaId}`).send({active: false})).status).toBe(200);

    const areas = await request(app).get('/api/v1/delivery/areas');
    expect(areas.body.items.map((row: {nameEn: string}) => row.nameEn)).not.toContain(areaName);

    await authed('patch', `/delivery/areas/${areaId}`).send({active: true});
  });

  it('renames an area that has no live orders against it', async () => {
    const renamed = await authed('patch', `/delivery/areas/${areaId}`).send({nameEn: renamedArea});
    expect(renamed.status, JSON.stringify(renamed.body)).toBe(200);
    await authed('patch', `/delivery/areas/${areaId}`).send({nameEn: areaName});
  });
});

describe('owner delivery slots', () => {
  it('fills a range with windows, skipping the days it is told to', async () => {
    const generated = await authed('post', '/delivery/slots/generate').send({
      areaIds: [areaId],
      from: first,
      to: last,
      windows: [
        {start: '10:00', end: '13:00'},
        {start: '16:00', end: '19:00'}
      ],
      capacity: 5,
      skipWeekdays: [dayOffset(120).getUTCDay()]
    });
    expect(generated.status, JSON.stringify(generated.body)).toBe(200);
    // Five days in the range, one weekday skipped, two windows each.
    expect(generated.body).toMatchObject({days: 4, written: 8, held: 0});

    const slots = await authed('get', `/delivery/slots?from=${first}&to=${last}&areaId=${areaId}`);
    expect(slots.body.items).toHaveLength(8);
    expect(slots.body.items.map((slot: {date: string}) => slot.date)).not.toContain(first);
  });

  it('will not cut a slot below what is already reserved', async () => {
    const slot = await prisma.deliverySlot.findFirstOrThrow({where: {areaId}});
    await prisma.deliverySlot.update({where: {id: slot.id}, data: {reserved: 3}});

    const cut = await authed('patch', `/delivery/slots/${slot.id}`).send({capacity: 1});
    expect(cut.status).toBe(409);
    expect(cut.body.error.code).toBe('CONFLICT');

    const allowed = await authed('patch', `/delivery/slots/${slot.id}`).send({capacity: 9});
    expect(allowed.body.capacity).toBe(9);
  });

  it('holds a reserved slot back from a bulk fill that would shrink it', async () => {
    const generated = await authed('post', '/delivery/slots/generate').send({
      areaIds: [areaId],
      from: first,
      to: last,
      windows: [{start: '10:00', end: '13:00'}],
      capacity: 2
    });
    expect(generated.body.held).toBe(1);
  });

  it('refuses to remove a slot with reservations against it', async () => {
    const reserved = await prisma.deliverySlot.findFirstOrThrow({where: {areaId, reserved: {gt: 0}}});
    expect((await authed('delete', `/delivery/slots/${reserved.id}`)).status).toBe(409);

    const free = await prisma.deliverySlot.findFirstOrThrow({where: {areaId, reserved: 0}});
    expect((await authed('delete', `/delivery/slots/${free.id}`)).status).toBe(204);
  });

  it('rejects a range that runs backwards', async () => {
    const backwards = await authed('get', `/delivery/slots?from=${last}&to=${first}`);
    expect(backwards.status).toBe(400);
  });
});

describe('owner production capacity', () => {
  it('reports days with no capacity row as unset', async () => {
    const listed = await authed('get', `/production-capacity?from=${first}&to=${last}`);
    expect(listed.status, JSON.stringify(listed.body)).toBe(200);
    expect(listed.body.items).toHaveLength(5);
    expect(listed.body.items[0]).toMatchObject({date: first, totalPoints: null, usedPoints: 0});
  });

  it('sets one day and fills a range around it', async () => {
    const single = await authed('put', '/production-capacity').send({date: first, totalPoints: 40});
    expect(single.status, JSON.stringify(single.body)).toBe(200);
    expect(single.body).toMatchObject({date: first, totalPoints: 40});

    const filled = await authed('post', '/production-capacity/range').send({
      from: first,
      to: last,
      totalPoints: 75,
      skipWeekdays: [dayOffset(121).getUTCDay()]
    });
    expect(filled.body).toMatchObject({written: 4, held: []});

    const listed = await authed('get', `/production-capacity?from=${first}&to=${last}`);
    const byDate = new Map(
      listed.body.items.map((row: {date: string; totalPoints: number | null}) => [
        row.date,
        row.totalPoints
      ])
    );
    expect(byDate.get(first)).toBe(75);
    expect(byDate.get(key(121))).toBeNull();
  });

  it('will not cut a day below the points already committed', async () => {
    await prisma.productionCapacity.update({
      where: {date: dayOffset(120)},
      data: {usedPoints: 30}
    });

    const cut = await authed('put', '/production-capacity').send({date: first, totalPoints: 10});
    expect(cut.status).toBe(409);
    expect(cut.body.error.message).toContain('30');

    const held = await authed('post', '/production-capacity/range').send({
      from: first,
      to: last,
      totalPoints: 10
    });
    expect(held.body.held).toContain(first);
    expect(held.body.written).toBe(4);
  });

  it('refuses a range longer than the bulk limit', async () => {
    const huge = await authed('get', `/production-capacity?from=${key(0)}&to=${key(365)}`);
    expect(huge.status).toBe(400);
  });
});

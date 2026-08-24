import 'dotenv/config';
import {Prisma} from '@prisma/client';
import {prisma} from '../src/db.js';
import {generateTotp} from '../src/owner-auth.js';

const apiBase = process.env.SMOKE_API_BASE || `http://127.0.0.1:${process.env.PORT || 3001}/api/v1`;
const emailPrefix = 'sync-check-';

type ApiResult<T = unknown> = {
  status: number;
  body: T;
  cookie: string;
};

async function api<T>(path: string, body?: unknown, cookie = '', method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? {Cookie: cookie} : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const setCookie = response.headers.get('set-cookie')?.split(',').map(part => part.split(';')[0]).join('; ') || '';
  const parsed = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
  }
  return {status: response.status, body: parsed as T, cookie: setCookie || cookie} satisfies ApiResult<T>;
}

async function cleanup(email: string, publicNumber?: string) {
  const users = await prisma.user.findMany({
    where: {email: {startsWith: emailPrefix}},
    select: {id: true}
  });
  const userIds = users.map(user => user.id);
  const orders = await prisma.order.findMany({
    where: {OR: [{publicNumber}, {userId: {in: userIds}}].filter(Boolean) as Prisma.OrderWhereInput[]},
    include: {reservation: true}
  });
  for (const order of orders) {
    await prisma.$transaction(async tx => {
      if (order.reservation?.active) {
        await tx.productionCapacity.updateMany({
          where: {date: order.reservation.date},
          data: {usedPoints: {decrement: order.reservation.points}}
        });
      }
      const [start] = order.deliveryWindow.split('-').map(value => value.trim());
      await tx.deliverySlot.updateMany({
        where: {area: {nameEn: order.areaName}, date: order.reservation?.date, windowStart: start},
        data: {reserved: {decrement: 1}}
      });
      await tx.capacityReservation.deleteMany({where: {orderId: order.id}});
      await tx.orderItem.deleteMany({where: {orderId: order.id}});
      await tx.order.delete({where: {id: order.id}});
    });
  }
  if (userIds.length > 0) {
    await prisma.session.deleteMany({where: {userId: {in: userIds}}});
    await prisma.mfaChallenge.deleteMany({where: {userId: {in: userIds}}});
    await prisma.wishlistItem.deleteMany({where: {userId: {in: userIds}}});
    await prisma.customerAddress.deleteMany({where: {userId: {in: userIds}}});
    await prisma.user.deleteMany({where: {id: {in: userIds}}});
  }
}

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;
  const totpSecret = process.env.OWNER_TOTP_SECRET;
  if (!ownerEmail || !ownerPassword || !totpSecret) {
    throw new Error('OWNER_EMAIL, OWNER_PASSWORD, and OWNER_TOTP_SECRET are required for the sync smoke check.');
  }

  const product = await prisma.product.findFirst({
    where: {published: true, active: true, archivedAt: null},
    orderBy: {slug: 'asc'},
    select: {slug: true}
  });
  const area = await prisma.deliveryArea.findFirst({
    where: {active: true},
    orderBy: {nameEn: 'asc'},
    select: {nameEn: true}
  });
  if (!product || !area) throw new Error('Seeded published products and active delivery areas are required.');

  const email = `${emailPrefix}${Date.now()}@example.com`;
  let orderNumber: string | undefined;

  try {
    const registered = await api<{customer: {email: string}}>('/customer/auth/register', {
      name: 'Sync Check Customer',
      email,
      password: 'Password123!'
    });
    const customerCookie = registered.cookie;

    await api('/customer/wishlist', {slugs: [product.slug]}, customerCookie, 'PUT');

    const quote = await api<{quoteId: string; earliestSlot: {date: string; window: string}}>('/checkout/quote', {
      area: area.nameEn,
      items: [{slug: product.slug, quantity: 1}]
    });
    const order = await api<{orderNumber: string}>('/orders', {
      quoteId: quote.body.quoteId,
      selectedSlot: quote.body.earliestSlot,
      customer: {name: 'Sync Check Customer', phone: '+96550000000', email},
      address: {
        governorate: 'Kuwait',
        area: area.nameEn,
        block: '1',
        street: 'Sync Street',
        building: '10'
      }
    });
    orderNumber = order.body.orderNumber;

    const account = await api<{orders: {publicNumber: string}[]; wishlist: string[]}>('/customer/me', undefined, customerCookie);
    const ownerLogin = await api('/owner/auth/login', {email: ownerEmail, password: ownerPassword});
    const ownerVerified = await api('/owner/auth/verify-totp', {code: generateTotp(totpSecret)}, ownerLogin.cookie);
    const owner = await api<{items: {publicNumber: string; status: string; fulfilmentStatus: string; codStatus: string}[]}>(
      '/owner/orders',
      undefined,
      ownerVerified.cookie
    );

    const customerSeesOrder = account.body.orders.some(item => item.publicNumber === orderNumber);
    const ownerOrder = owner.body.items.find(item => item.publicNumber === orderNumber);
    const wishlistSynced = account.body.wishlist.includes(product.slug);

    if (!customerSeesOrder || !ownerOrder || !wishlistSynced) {
      throw new Error(
        JSON.stringify({customerSeesOrder, ownerSeesOrder: Boolean(ownerOrder), wishlistSynced, orderNumber})
      );
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          orderNumber,
          product: product.slug,
          customerSeesOrder,
          ownerSeesOrder: Boolean(ownerOrder),
          ownerOrderStatus: ownerOrder.status,
          fulfilmentStatus: ownerOrder.fulfilmentStatus,
          codStatus: ownerOrder.codStatus,
          wishlistSynced
        },
        null,
        2
      )
    );
  } finally {
    await cleanup(email, orderNumber);
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

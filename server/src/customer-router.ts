import {createHash, randomBytes} from 'node:crypto';
import express from 'express';
import {z} from 'zod';
import {prisma} from './db.js';
import {hashPassword, verifyPassword} from './owner-auth.js';
import {authLimiter, unauthenticated, validationError} from './http.js';
import {OrderLifecycleError, updateOrderLifecycle} from './order-lifecycle-service.js';

const cookieName = 'onebite_customer_session';
const cookiePath = '/api/v1/customer';
const sessionDays = 30;

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function readCookie(req: express.Request, name: string) {
  return req.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function setSessionCookie(res: express.Response, token: string) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: cookiePath,
    maxAge: sessionDays * 24 * 60 * 60 * 1000
  });
}

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200)
});

const register = credentials.extend({name: z.string().min(2).max(120)});

const slugs = z.object({slugs: z.array(z.string().min(1).max(120)).max(200)});

const address = z.object({
  label: z.string().min(1).max(80).optional(),
  governorate: z.string().min(1),
  areaName: z.string().min(1),
  block: z.string().min(1),
  street: z.string().min(1),
  building: z.string().min(1),
  floorOrApartment: z.string().max(100).optional(),
  deliveryInstructions: z.string().max(500).optional()
});

function parse<T>(schema: z.ZodType<T>, req: express.Request, res: express.Response, message: string) {
  const result = schema.safeParse(req.body);
  if (result.success) return result.data;
  validationError(res, message);
  return undefined;
}

async function createSession(userId: string, res: express.Response) {
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000)
    }
  });
  setSessionCookie(res, token);
}

export async function customerFromRequest(req: express.Request) {
  const token = readCookie(req, cookieName);
  if (!token) return null;
  const session = await prisma.session.findUnique({where: {tokenHash: hash(token)}, include: {user: true}});
  if (!session || session.expiresAt <= new Date() || session.user.role !== 'CUSTOMER') return null;
  return session.user;
}

const orderShape = {
  publicNumber: true,
  trackingToken: true,
  status: true,
  fulfilmentStatus: true,
  codStatus: true,
  deliveryWindow: true,
  areaName: true,
  totalFils: true,
  createdAt: true
} as const;

export function customerRouter() {
  const router = express.Router();

  router.post('/auth/register', authLimiter(), async (req, res) => {
    const body = parse(register, req, res, 'Invalid registration details');
    if (!body) return;
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({where: {email}});
    if (existing?.role !== undefined && existing.role !== 'CUSTOMER') {
      return res.status(409).json({error: {code: 'CONFLICT', message: 'That email cannot be used for a customer account.'}});
    }
    if (existing?.passwordHash) {
      return res.status(409).json({error: {code: 'CONFLICT', message: 'A customer account already exists for that email.'}});
    }

    const user = existing
      ? await prisma.user.update({
          where: {id: existing.id},
          data: {name: body.name, passwordHash: hashPassword(body.password), role: 'CUSTOMER'},
          select: {id: true, name: true, email: true}
        })
      : await prisma.user.create({
          data: {name: body.name, email, passwordHash: hashPassword(body.password), role: 'CUSTOMER'},
          select: {id: true, name: true, email: true}
        });
    await createSession(user.id, res);
    res.status(201).json({customer: user});
  });

  router.post('/auth/login', authLimiter(), async (req, res) => {
    const body = parse(credentials, req, res, 'Invalid login details');
    if (!body) return;
    const user = await prisma.user.findFirst({where: {email: body.email.toLowerCase(), role: 'CUSTOMER'}});
    if (!user?.passwordHash || !verifyPassword(body.password, user.passwordHash)) {
      return res.status(401).json({error: {code: 'INVALID_CREDENTIALS', message: 'Invalid customer credentials'}});
    }
    await createSession(user.id, res);
    res.json({customer: {id: user.id, name: user.name, email: user.email}});
  });

  router.post('/auth/logout', async (req, res) => {
    const token = readCookie(req, cookieName);
    if (token) await prisma.session.deleteMany({where: {tokenHash: hash(token)}});
    res.clearCookie(cookieName, {path: cookiePath});
    res.status(204).end();
  });

  router.use(async (req, res, next) => {
    const customer = await customerFromRequest(req);
    if (!customer) return unauthenticated(res);
    res.locals.customer = customer;
    next();
  });

  router.get('/me', async (_req, res) => {
    const customer = res.locals.customer as {id: string; name: string; email: string | null};
    const [orders, addresses, wishlist] = await Promise.all([
      prisma.order.findMany({
        where: {userId: customer.id},
        orderBy: {createdAt: 'desc'},
        select: orderShape
      }),
      prisma.customerAddress.findMany({
        where: {userId: customer.id},
        orderBy: {createdAt: 'desc'}
      }),
      prisma.wishlistItem.findMany({
        where: {userId: customer.id},
        select: {product: {select: {slug: true}}},
        orderBy: {createdAt: 'desc'}
      })
    ]);
    res.json({
      customer,
      orders,
      addresses,
      wishlist: wishlist.map(item => item.product.slug)
    });
  });

  router.put('/wishlist', async (req, res) => {
    const body = parse(slugs, req, res, 'Invalid wishlist');
    if (!body) return;
    const customer = res.locals.customer as {id: string};
    const products = await prisma.product.findMany({
      where: {slug: {in: body.slugs}, published: true, active: true, archivedAt: null},
      select: {id: true, slug: true}
    });
    await prisma.$transaction([
      prisma.wishlistItem.deleteMany({where: {userId: customer.id}}),
      prisma.wishlistItem.createMany({
        data: products.map(product => ({userId: customer.id, productId: product.id})),
        skipDuplicates: true
      })
    ]);
    res.json({wishlist: products.map(product => product.slug)});
  });

  router.post('/addresses', async (req, res) => {
    const body = parse(address, req, res, 'Invalid address');
    if (!body) return;
    const customer = res.locals.customer as {id: string};
    res.status(201).json(await prisma.customerAddress.create({data: {...body, userId: customer.id}}));
  });

  router.delete('/addresses/:id', async (req, res) => {
    const customer = res.locals.customer as {id: string};
    await prisma.customerAddress.deleteMany({where: {id: req.params.id, userId: customer.id}});
    res.status(204).end();
  });

  router.post('/orders/:publicNumber/cancel', async (req, res, next) => {
    try {
      const customer = res.locals.customer as {id: string};
      const order = await prisma.order.findFirst({
        where: {publicNumber: req.params.publicNumber, userId: customer.id},
        select: {publicNumber: true}
      });
      if (!order) return res.status(404).json({error: {code: 'NOT_FOUND', message: 'Order not found'}});
      res.json(await updateOrderLifecycle(order.publicNumber, {status: 'CANCELLED'}));
    } catch (error) {
      if (error instanceof OrderLifecycleError) return next(error);
      next(error);
    }
  });

  return router;
}

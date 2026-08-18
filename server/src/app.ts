import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {prisma} from './db.js';
import {calculateAvailability} from './availability-service.js';
import {CartError, cartSubtotalFils, type CartLine} from './cart-service.js';
import {createReservedOrder, OrderConflictError} from './order-service.js';
import {claimQuote, createQuote} from './quote-service.js';
import {ownerRouter} from './owner-router.js';
import {AdminError} from './admin-service.js';
import {OrderLifecycleError} from './order-lifecycle-service.js';
import {authLimiter, validationError} from './http.js';

const cartItem = z.object({
  slug: z.string(),
  quantity: z.number().int().min(1),
  variantId: z.string().min(1).optional(),
  addonIds: z.array(z.string().min(1)).max(10).optional(),
  cakeText: z.string().max(200).optional()
});

const cart = z.object({
  items: z.array(cartItem).min(1).max(50),
  area: z.string().min(1)
});

const order = z.object({
  quoteId: z.string().uuid(),
  selectedSlot: z.object({date: z.string(), window: z.string()}),
  customer: z.object({
    name: z.string().min(2),
    phone: z.string().min(6)
  }),
  address: z.object({
    governorate: z.string().min(1),
    area: z.string().min(1),
    block: z.string().min(1),
    street: z.string().min(1),
    building: z.string().min(1),
    floor: z.string().max(100).optional(),
    instructions: z.string().max(500).optional()
  })
});

const trackingLookup = z.object({
  orderNumber: z.string().min(1),
  phone: z.string().min(6)
});

const publicProduct = {published: true, active: true, archivedAt: null};

const optionFields = {id: true, nameEn: true, nameAr: true, priceFils: true, capacityPoints: true};

// The catalog is small enough that returning options with the list saves the
// storefront a second round trip per product page.
const publicProductShape = {
  slug: true,
  nameEn: true,
  nameAr: true,
  descriptionEn: true,
  descriptionAr: true,
  priceFils: true,
  capacityPoints: true,
  leadDays: true,
  imageUrl: true,
  tags: true,
  tagsAr: true,
  servingsEn: true,
  servingsAr: true,
  allergens: true,
  bestSeller: true,
  seasonal: true,
  giftable: true,
  cakeTextMaxLength: true,
  cakeTextPriceFils: true,
  cakeTextPoints: true,
  category: {select: {slug: true}},
  variants: {
    select: {...optionFields, leadDays: true},
    where: {active: true},
    orderBy: {priceFils: 'asc'}
  },
  addons: {select: optionFields, where: {active: true}, orderBy: {priceFils: 'asc'}}
} as const;

// Kuwait subscriber numbers are 8 digits. Comparing the trailing 8 lets a
// customer look their order up whether or not they repeat the +965 they typed
// at checkout, without loosening the match to something guessable.
const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(-8);

export function createApp() {
  const app = express();

  app.use(pinoHttp());
  app.use(helmet());
  // credentials:true is what lets the owner session cookie travel to an API on
  // another origin; without it owner auth only works through the dev proxy.
  // It requires a concrete origin — the wildcard is rejected by browsers here.
  app.use(cors({origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true}));
  app.use(express.json({limit: '100kb'}));
  app.use((_, res, next) => {
    res.setHeader('X-Request-Id', randomUUID());
    next();
  });

  app.get('/api/v1/health', (_, res) => res.json({ok: true}));

  app.use('/api/v1/owner', ownerRouter());

  app.get('/api/v1/catalog/categories', async (_req, res, next) => {
    try {
      const categories = await prisma.category.findMany({
        where: {archivedAt: null, products: {some: publicProduct}},
        orderBy: [{sortOrder: 'asc'}, {nameEn: 'asc'}],
        select: {
          slug: true,
          nameEn: true,
          nameAr: true,
          descriptionEn: true,
          descriptionAr: true,
          imageUrl: true,
          _count: {select: {products: {where: publicProduct}}}
        }
      });
      res.json(
        categories.map(({_count, ...category}) => ({...category, productCount: _count.products}))
      );
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/catalog/products', async (_req, res, next) => {
    try {
      const items = await prisma.product.findMany({
        where: publicProduct,
        orderBy: {nameEn: 'asc'},
        select: publicProductShape
      });
      res.json({items});
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/catalog/products/:slug', async (req, res, next) => {
    try {
      const product = await prisma.product.findFirst({
        where: {...publicProduct, slug: req.params.slug},
        select: publicProductShape
      });
      if (!product) return res.status(404).json({error: {code: 'NOT_FOUND', message: 'Product not found'}});
      res.json(product);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/delivery/areas', async (_req, res, next) => {
    try {
      const items = await prisma.deliveryArea.findMany({
        where: {active: true},
        orderBy: [{feeFils: 'asc'}, {nameEn: 'asc'}],
        select: {nameEn: true, nameAr: true, feeFils: true}
      });
      res.json({items});
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/availability/earliest', async (req, res, next) => {
    try {
      const parsed = cart.safeParse(req.body);
      if (!parsed.success) return validationError(res, 'Invalid cart');
      const {lines, ...availability} = await calculateAvailability(parsed.data.items, parsed.data.area);
      res.json(availability);
    } catch (error) {
      if (error instanceof CartError) return validationError(res, error.message);
      next(error);
    }
  });

  app.post('/api/v1/checkout/quote', async (req, res, next) => {
    try {
      const parsed = cart.safeParse(req.body);
      if (!parsed.success) return validationError(res, 'Invalid cart');

      const result = await calculateAvailability(parsed.data.items, parsed.data.area);
      if (result.unavailable) return res.status(409).json({error: {code: 'UNAVAILABLE', message: result.reason}});

      const subtotal = cartSubtotalFils(result.lines);
      const area = await prisma.deliveryArea.findFirstOrThrow({where: {nameEn: parsed.data.area, active: true}});
      const quote = await createQuote(parsed.data.items, parsed.data.area);

      res.json({
        quoteId: quote.id,
        expiresAt: quote.expiresAt.toISOString(),
        items: result.lines.map(line => ({
          slug: line.slug,
          quantity: line.quantity,
          nameEn: line.product.nameEn,
          nameAr: line.product.nameAr,
          variantName: line.variant?.nameEn ?? null,
          addonNames: line.addons.map(addon => addon.nameEn),
          cakeText: line.cakeText,
          unitPriceFils: line.unitPriceFils,
          capacityPoints: line.unitCapacityPoints
        })),
        subtotalFils: subtotal,
        discountFils: 0,
        deliveryFeeFils: area.feeFils,
        totalFils: subtotal + area.feeFils,
        capacityPoints: result.capacityPoints,
        earliestSlot: result.earliestSlot,
        availableSlots: result.availableSlots
      });
    } catch (error) {
      if (error instanceof CartError) return validationError(res, error.message);
      next(error);
    }
  });

  app.post('/api/v1/orders', async (req, res, next) => {
    try {
      const parsed = order.safeParse(req.body);
      if (!parsed.success) return validationError(res, 'Invalid order');

      // Claimed before the order is built, so one quote cannot yield two orders.
      const quote = await claimQuote(parsed.data.quoteId);
      if (!quote) {
        return res.status(409).json({error: {code: 'STALE_QUOTE', message: 'Your quote has expired. Please refresh availability.'}});
      }

      const created = await createReservedOrder({
        items: quote.items,
        area: quote.areaName,
        selectedSlot: parsed.data.selectedSlot,
        customer: parsed.data.customer,
        address: parsed.data.address
      });

      res.status(201).json({
        orderNumber: created.publicNumber,
        trackingToken: created.trackingToken,
        status: created.status,
        message: 'Awaiting bakery confirmation.'
      });
    } catch (error) {
      if (error instanceof OrderConflictError) {
        return res.status(409).json({error: {code: 'UNAVAILABLE', message: error.message}});
      }
      if (error instanceof CartError) return validationError(res, error.message);
      next(error);
    }
  });

  app.get('/api/v1/tracking/:token', async (req, res, next) => {
    try {
      const found = await prisma.order.findUnique({
        where: {trackingToken: req.params.token},
        select: {
          publicNumber: true,
          status: true,
          fulfilmentStatus: true,
          codStatus: true,
          deliveryWindow: true,
          areaName: true,
          isDelayed: true,
          delayReason: true,
          createdAt: true
        }
      });
      if (!found) return res.status(404).json({error: {code: 'NOT_FOUND', message: 'Tracking record not found'}});
      res.json(found);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/v1/tracking/lookup', authLimiter(), async (req, res, next) => {
    try {
      const body = trackingLookup.safeParse(req.body);
      if (!body.success) return validationError(res, 'Invalid lookup details');

      const found = await prisma.order.findUnique({
        where: {publicNumber: body.data.orderNumber},
        select: {trackingToken: true, customerPhone: true}
      });
      if (!found || normalizePhone(found.customerPhone) !== normalizePhone(body.data.phone)) {
        return res.status(404).json({error: {code: 'NOT_FOUND', message: 'Tracking record not found'}});
      }
      res.json({trackingToken: found.trackingToken});
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Owner-facing refusals — a duplicate slug, a capacity cut below what is
    // reserved, an order already past the state being asked for — are answers,
    // not failures, and carry their own status and code.
    if (error instanceof AdminError) {
      return res.status(error.status).json({error: {code: error.code, message: error.message}});
    }
    if (error instanceof OrderLifecycleError) {
      const status = error.message === 'Order not found.' ? 404 : 409;
      return res.status(status).json({error: {code: 'ORDER_STATE_ERROR', message: error.message}});
    }

    // Without this the cause of every 500 was discarded, leaving nothing to
    // debug from. The response stays deliberately opaque to the caller.
    req.log?.error({err: error}, 'unhandled request error');
    res.status(500).json({error: {code: 'INTERNAL_ERROR', message: 'An unexpected error occurred'}});
  });

  return app;
}

import express from 'express';
import {z} from 'zod';
import {prisma} from './db.js';
import {authLimiter, unauthenticated, validationError} from './http.js';
import {beginOwnerLogin, completeOwnerLogin, logoutOwner, ownerFromRequest} from './owner-auth.js';
import {updateOrderLifecycle} from './order-lifecycle-service.js';
import * as admin from './admin-service.js';

const ownerLogin = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200)
});

const totp = z.object({code: z.string().regex(/^\d{6}$/)});

const orderUpdate = z
  .object({
    status: z.enum(['CONFIRMED', 'REJECTED', 'CANCELLED']).optional(),
    fulfilmentStatus: z
      .enum(['NOT_STARTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_ISSUE'])
      .optional(),
    codStatus: z.enum(['COD_DUE', 'COLLECTED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'WAIVED']).optional(),
    rejectionReason: z.string().min(2).max(500).optional()
  })
  .refine(value => Object.keys(value).length > 0);

const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by single hyphens');

const text = (max: number) => z.string().min(1).max(max);
const optionalText = (max: number) => z.string().max(max).nullish();
const url = z.string().url().max(600).nullish();
const fils = z.number().int().min(0).max(10_000_000);
const points = z.number().int().min(0).max(10_000);
const leadDays = z.number().int().min(0).max(90);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date');
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Use a HH:MM time');
const weekdays = z.array(z.number().int().min(0).max(6)).max(7);
const slotCapacity = z.number().int().min(0).max(1000);

const category = z.object({
  slug,
  nameEn: text(120),
  nameAr: text(120),
  descriptionEn: optionalText(600),
  descriptionAr: optionalText(600),
  imageUrl: url,
  sortOrder: z.number().int().min(0).max(999).optional()
});

const categoryUpdate = category.partial().extend({archived: z.boolean().optional()});

const product = z.object({
  slug,
  categoryId: z.string().min(1),
  nameEn: text(160),
  nameAr: text(160),
  descriptionEn: text(2000),
  descriptionAr: text(2000),
  priceFils: fils,
  capacityPoints: points.optional(),
  leadDays: leadDays.optional(),
  published: z.boolean().optional(),
  active: z.boolean().optional(),
  imageUrl: url,
  tags: z.array(text(60)).max(12).optional(),
  tagsAr: z.array(text(60)).max(12).optional(),
  servingsEn: optionalText(120),
  servingsAr: optionalText(120),
  allergens: z.array(text(60)).max(20).optional(),
  bestSeller: z.boolean().optional(),
  seasonal: z.boolean().optional(),
  giftable: z.boolean().optional(),
  cakeTextMaxLength: z.number().int().min(1).max(200).nullish(),
  cakeTextPriceFils: fils.nullish(),
  cakeTextPoints: points.nullish()
});

const productUpdate = product.partial().extend({archived: z.boolean().optional()});

const option = z.object({
  nameEn: text(120),
  nameAr: text(120),
  priceFils: fils,
  capacityPoints: points,
  leadDays: leadDays.optional(),
  active: z.boolean().optional()
});

const optionUpdate = option.partial();

const area = z.object({
  nameEn: text(120),
  nameAr: text(120),
  feeFils: fils,
  active: z.boolean().optional()
});

const areaUpdate = area.partial();

const slot = z.object({
  areaId: z.string().min(1),
  date,
  windowStart: time,
  windowEnd: time,
  capacity: slotCapacity
});

const slotUpdate = z.object({capacity: slotCapacity});

const slotPlan = z.object({
  areaIds: z.array(z.string().min(1)).min(1).max(50),
  from: date,
  to: date,
  windows: z.array(z.object({start: time, end: time})).min(1).max(6),
  capacity: slotCapacity,
  skipWeekdays: weekdays.optional()
});

const capacity = z.object({date, totalPoints: points});

const capacityPlan = z.object({
  from: date,
  to: date,
  totalPoints: points,
  skipWeekdays: weekdays.optional()
});

const dateWindow = z.object({from: date, to: date});
const slotQuery = dateWindow.extend({areaId: z.string().min(1).optional()});

/**
 * Validates a body, answering 400 itself when it does not fit and returning
 * undefined, so callers stop at `if (!body) return;`.
 */
function parse<T>(schema: z.ZodType<T>, req: express.Request, res: express.Response, message: string) {
  const result = schema.safeParse(req.body);
  if (result.success) return result.data;
  validationError(res, message);
  return undefined;
}

/**
 * Handlers here rely on Express 5 forwarding a rejected promise to the app's
 * error middleware, which is where `AdminError` is turned into the status and
 * code the owner sees. Nothing needs its own try/catch as a result.
 */
export function ownerRouter() {
  const router = express.Router();

  router.post('/auth/login', authLimiter(), async (req, res) => {
    const body = parse(ownerLogin, req, res, 'Invalid login details');
    if (!body) return;
    const accepted = await beginOwnerLogin(body.email.toLowerCase(), body.password, res);
    if (!accepted) {
      return res
        .status(401)
        .json({error: {code: 'INVALID_CREDENTIALS', message: 'Invalid owner credentials'}});
    }
    res.status(202).json({requiresTotp: true});
  });

  router.post('/auth/verify-totp', authLimiter(), async (req, res) => {
    const body = parse(totp, req, res, 'Invalid verification code');
    if (!body) return;
    const owner = await completeOwnerLogin(body.code, req, res);
    if (!owner) {
      return res
        .status(401)
        .json({error: {code: 'INVALID_TOTP', message: 'Invalid or expired verification code'}});
    }
    res.json({owner});
  });

  router.post('/auth/logout', async (req, res) => {
    await logoutOwner(req, res);
    res.status(204).end();
  });

  // Everything past this point is the dashboard proper, so the session check
  // lives here once rather than at the top of every handler.
  router.use(async (req, res, next) => {
    const owner = await ownerFromRequest(req);
    if (!owner) return unauthenticated(res);
    res.locals.owner = owner;
    next();
  });

  router.get('/me', (_req, res) => {
    const owner = res.locals.owner as {id: string; name: string; email: string | null};
    res.json({id: owner.id, name: owner.name, email: owner.email});
  });

  // ------------------------------------------------------------------ orders

  router.get('/orders', async (_req, res) => {
    const items = await prisma.order.findMany({
      orderBy: {createdAt: 'desc'},
      take: 100,
      select: {
        publicNumber: true,
        status: true,
        fulfilmentStatus: true,
        codStatus: true,
        customerName: true,
        customerPhone: true,
        areaName: true,
        deliveryWindow: true,
        totalFils: true,
        createdAt: true
      }
    });
    res.json({items});
  });

  router.patch('/orders/:publicNumber', async (req, res) => {
    const body = parse(orderUpdate, req, res, 'Invalid order update');
    if (!body) return;
    res.json(await updateOrderLifecycle(req.params.publicNumber, body));
  });

  // -------------------------------------------------------------- categories

  router.get('/categories', async (_req, res) => {
    res.json({items: await admin.listCategories()});
  });

  router.post('/categories', async (req, res) => {
    const body = parse(category, req, res, 'Invalid category');
    if (!body) return;
    res.status(201).json(await admin.createCategory(body));
  });

  router.patch('/categories/:id', async (req, res) => {
    const body = parse(categoryUpdate, req, res, 'Invalid category');
    if (!body) return;
    res.json(await admin.updateCategory(req.params.id, body));
  });

  // ---------------------------------------------------------------- products

  router.get('/products', async (_req, res) => {
    res.json({items: await admin.listProducts()});
  });

  router.get('/products/:id', async (req, res) => {
    res.json(await admin.getProduct(req.params.id));
  });

  router.post('/products', async (req, res) => {
    const body = parse(product, req, res, 'Invalid product');
    if (!body) return;
    res.status(201).json(await admin.createProduct(body));
  });

  router.patch('/products/:id', async (req, res) => {
    const body = parse(productUpdate, req, res, 'Invalid product');
    if (!body) return;
    res.json(await admin.updateProduct(req.params.id, body));
  });

  router.post('/products/:id/variants', async (req, res) => {
    const body = parse(option, req, res, 'Invalid variant');
    if (!body) return;
    res.status(201).json(await admin.createVariant(req.params.id, body));
  });

  router.patch('/variants/:id', async (req, res) => {
    const body = parse(optionUpdate, req, res, 'Invalid variant');
    if (!body) return;
    res.json(await admin.updateVariant(req.params.id, body));
  });

  router.post('/products/:id/addons', async (req, res) => {
    const body = parse(option, req, res, 'Invalid add-on');
    if (!body) return;
    res.status(201).json(await admin.createAddon(req.params.id, body));
  });

  router.patch('/addons/:id', async (req, res) => {
    const body = parse(optionUpdate, req, res, 'Invalid add-on');
    if (!body) return;
    res.json(await admin.updateAddon(req.params.id, body));
  });

  // ---------------------------------------------------------- delivery areas

  router.get('/delivery/areas', async (_req, res) => {
    res.json({items: await admin.listAreas()});
  });

  router.post('/delivery/areas', async (req, res) => {
    const body = parse(area, req, res, 'Invalid delivery area');
    if (!body) return;
    res.status(201).json(await admin.createArea(body));
  });

  router.patch('/delivery/areas/:id', async (req, res) => {
    const body = parse(areaUpdate, req, res, 'Invalid delivery area');
    if (!body) return;
    res.json(await admin.updateArea(req.params.id, body));
  });

  // ---------------------------------------------------------- delivery slots

  // Declared before '/delivery/slots/:id' so the literal path is not captured
  // as an id.
  router.post('/delivery/slots/generate', async (req, res) => {
    const body = parse(slotPlan, req, res, 'Invalid slot plan');
    if (!body) return;
    res.json(await admin.generateSlots(body));
  });

  router.get('/delivery/slots', async (req, res) => {
    const query = slotQuery.safeParse(req.query);
    if (!query.success) return validationError(res, 'Invalid slot range');
    res.json({items: await admin.listSlots(query.data.from, query.data.to, query.data.areaId)});
  });

  router.post('/delivery/slots', async (req, res) => {
    const body = parse(slot, req, res, 'Invalid delivery slot');
    if (!body) return;
    res.status(201).json(await admin.upsertSlot(body));
  });

  router.patch('/delivery/slots/:id', async (req, res) => {
    const body = parse(slotUpdate, req, res, 'Invalid delivery slot');
    if (!body) return;
    res.json(await admin.updateSlot(req.params.id, body.capacity));
  });

  router.delete('/delivery/slots/:id', async (req, res) => {
    await admin.deleteSlot(req.params.id);
    res.status(204).end();
  });

  // ----------------------------------------------------- production capacity

  router.get('/production-capacity', async (req, res) => {
    const query = dateWindow.safeParse(req.query);
    if (!query.success) return validationError(res, 'Invalid capacity range');
    res.json({items: await admin.listCapacity(query.data.from, query.data.to)});
  });

  router.put('/production-capacity', async (req, res) => {
    const body = parse(capacity, req, res, 'Invalid production capacity');
    if (!body) return;
    res.json(await admin.setCapacity(body.date, body.totalPoints));
  });

  router.post('/production-capacity/range', async (req, res) => {
    const body = parse(capacityPlan, req, res, 'Invalid capacity plan');
    if (!body) return;
    res.json(await admin.setCapacityRange(body.from, body.to, body.totalPoints, body.skipWeekdays));
  });

  return router;
}

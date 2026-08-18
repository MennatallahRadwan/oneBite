import {prisma} from './db.js';

/**
 * A refusal the owner should see and can act on — a duplicate slug, a capacity
 * cut below what is already reserved. The router turns it into its status and
 * code; anything else stays a 500.
 */
export class AdminError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

const notFound = (what: string) => new AdminError('NOT_FOUND', 404, `${what} not found.`);

/**
 * A patch can end up empty — every field it carried was one this row derives
 * for itself. Prisma's updateMany matches nothing when handed no data, which
 * would read as a missing row, so the no-op is answered from the row instead.
 */
const nothingToChange = (data: object) => Object.keys(data).length === 0;

/** The horizon a single bulk write may cover, so one request cannot fill years. */
const maxBulkDays = 180;

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

function dateRange(from: string, to: string) {
  const start = day(from);
  const end = day(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AdminError('VALIDATION_ERROR', 400, 'Invalid date range.');
  }
  if (end < start) throw new AdminError('VALIDATION_ERROR', 400, 'The range ends before it starts.');

  const days: Date[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push(new Date(cursor));
    if (days.length > maxBulkDays) {
      throw new AdminError('VALIDATION_ERROR', 400, `A range may cover at most ${maxBulkDays} days.`);
    }
  }
  return days;
}

/**
 * Prisma reports a unique-constraint breach as P2002. Every unique column the
 * owner can type into is a name or a slug, so the conflict is worth naming
 * rather than hiding behind a 500.
 */
async function unique<T>(what: string, work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if ((error as {code?: string} | null)?.code === 'P2002') {
      throw new AdminError('CONFLICT', 409, `Another ${what} already uses that name or slug.`);
    }
    throw error;
  }
}

// ---------------------------------------------------------------- categories

const categoryShape = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  descriptionEn: true,
  descriptionAr: true,
  imageUrl: true,
  sortOrder: true,
  archivedAt: true
} as const;

export type CategoryInput = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{sortOrder: 'asc'}, {nameEn: 'asc'}],
    select: {...categoryShape, _count: {select: {products: {where: {archivedAt: null}}}}}
  });
  return categories.map(({_count, ...category}) => ({...category, productCount: _count.products}));
}

export const createCategory = (data: CategoryInput) =>
  unique('category', () => prisma.category.create({data, select: categoryShape}));

export async function updateCategory(id: string, data: Partial<CategoryInput> & {archived?: boolean}) {
  const {archived, ...fields} = data;
  const changes = {
    ...fields,
    ...(archived === undefined ? {} : {archivedAt: archived ? new Date() : null})
  };

  if (!nothingToChange(changes)) {
    const updated = await unique('category', () =>
      prisma.category.updateMany({where: {id}, data: changes})
    );
    if (updated.count !== 1) throw notFound('Category');
  }

  const category = await prisma.category.findUnique({where: {id}, select: categoryShape});
  if (!category) throw notFound('Category');
  return category;
}

// ------------------------------------------------------------------ products

const optionShape = {
  id: true,
  nameEn: true,
  nameAr: true,
  priceFils: true,
  capacityPoints: true,
  active: true
} as const;

const variantShape = {...optionShape, leadDays: true} as const;

const productShape = {
  id: true,
  slug: true,
  categoryId: true,
  nameEn: true,
  nameAr: true,
  descriptionEn: true,
  descriptionAr: true,
  priceFils: true,
  capacityPoints: true,
  leadDays: true,
  published: true,
  active: true,
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
  archivedAt: true,
  variants: {select: variantShape, orderBy: {priceFils: 'asc'}},
  addons: {select: optionShape, orderBy: {priceFils: 'asc'}}
} as const;

export type ProductInput = {
  slug: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceFils: number;
  capacityPoints?: number;
  leadDays?: number;
  published?: boolean;
  active?: boolean;
  imageUrl?: string | null;
  tags?: string[];
  tagsAr?: string[];
  servingsEn?: string | null;
  servingsAr?: string | null;
  allergens?: string[];
  bestSeller?: boolean;
  seasonal?: boolean;
  giftable?: boolean;
  cakeTextMaxLength?: number | null;
  cakeTextPriceFils?: number | null;
  cakeTextPoints?: number | null;
};

export const listProducts = () =>
  prisma.product.findMany({orderBy: {nameEn: 'asc'}, select: productShape});

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({where: {id}, select: productShape});
  if (!product) throw notFound('Product');
  return product;
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findUnique({where: {id: categoryId}, select: {id: true}});
  if (!category) throw new AdminError('VALIDATION_ERROR', 400, 'That category does not exist.');
}

export async function createProduct(data: ProductInput) {
  await assertCategory(data.categoryId);
  return unique('product', () => prisma.product.create({data, select: productShape}));
}

export async function updateProduct(id: string, data: Partial<ProductInput> & {archived?: boolean}) {
  const {archived, ...fields} = data;
  if (fields.categoryId) await assertCategory(fields.categoryId);

  // A product's base points and lead time follow its cheapest active variant
  // whenever it has any, so accepting them here would only let the next variant
  // edit silently overwrite whatever the owner typed.
  const variants = await prisma.productVariant.count({where: {productId: id, active: true}});
  if (variants) {
    delete fields.capacityPoints;
    delete fields.leadDays;
  }

  const changes = {
    ...fields,
    ...(archived === undefined ? {} : {archivedAt: archived ? new Date() : null})
  };
  if (!nothingToChange(changes)) {
    const updated = await unique('product', () => prisma.product.updateMany({where: {id}, data: changes}));
    if (updated.count !== 1) throw notFound('Product');
  }
  return getProduct(id);
}

/**
 * Mirrors the seed's rule: the price shown on a card and the lead time quoted
 * before a variant is chosen belong to the smallest variant, so they have to be
 * recomputed whenever the variant set changes.
 */
async function syncProductBase(productId: string) {
  const smallest = await prisma.productVariant.findFirst({
    where: {productId, active: true},
    orderBy: {priceFils: 'asc'},
    select: {capacityPoints: true, leadDays: true}
  });
  if (!smallest) return;
  await prisma.product.update({
    where: {id: productId},
    data: {capacityPoints: smallest.capacityPoints, leadDays: smallest.leadDays}
  });
}

export type OptionInput = {
  nameEn: string;
  nameAr: string;
  priceFils: number;
  capacityPoints: number;
  leadDays?: number;
  active?: boolean;
};

async function assertProduct(productId: string) {
  const product = await prisma.product.findUnique({where: {id: productId}, select: {id: true}});
  if (!product) throw notFound('Product');
}

export async function createVariant(productId: string, data: OptionInput) {
  await assertProduct(productId);
  const variant = await prisma.productVariant.create({
    data: {...data, productId},
    select: variantShape
  });
  await syncProductBase(productId);
  return variant;
}

export async function updateVariant(id: string, data: Partial<OptionInput>) {
  const existing = await prisma.productVariant.findUnique({where: {id}, select: {productId: true}});
  if (!existing) throw notFound('Variant');
  const variant = nothingToChange(data)
    ? await prisma.productVariant.findUniqueOrThrow({where: {id}, select: variantShape})
    : await prisma.productVariant.update({where: {id}, data, select: variantShape});
  await syncProductBase(existing.productId);
  return variant;
}

export async function createAddon(productId: string, data: OptionInput) {
  await assertProduct(productId);
  const {leadDays: _leadDays, ...fields} = data;
  return prisma.productAddon.create({data: {...fields, productId}, select: optionShape});
}

export async function updateAddon(id: string, data: Partial<OptionInput>) {
  const {leadDays: _leadDays, ...fields} = data;
  if (!nothingToChange(fields)) {
    const updated = await prisma.productAddon.updateMany({where: {id}, data: fields});
    if (updated.count !== 1) throw notFound('Add-on');
  }
  const addon = await prisma.productAddon.findUnique({where: {id}, select: optionShape});
  if (!addon) throw notFound('Add-on');
  return addon;
}

// ------------------------------------------------------------ delivery areas

const areaShape = {id: true, nameEn: true, nameAr: true, feeFils: true, active: true} as const;

export type AreaInput = {nameEn: string; nameAr: string; feeFils: number; active?: boolean};

export const listAreas = () =>
  prisma.deliveryArea.findMany({orderBy: [{feeFils: 'asc'}, {nameEn: 'asc'}], select: areaShape});

export const createArea = (data: AreaInput) =>
  unique('delivery area', () => prisma.deliveryArea.create({data, select: areaShape}));

export async function updateArea(id: string, data: Partial<AreaInput>) {
  // Orders record the area by its English name, and releasing a reservation
  // looks the area back up by that name to free its delivery slot. Renaming an
  // area with live orders would strand those releases.
  if (data.nameEn) {
    const area = await prisma.deliveryArea.findUnique({where: {id}, select: {nameEn: true}});
    if (!area) throw notFound('Delivery area');
    if (area.nameEn !== data.nameEn) {
      const live = await prisma.order.count({
        where: {areaName: area.nameEn, reservation: {is: {active: true}}}
      });
      if (live) {
        throw new AdminError(
          'CONFLICT',
          409,
          'This area has live orders recorded under its current name. Deactivate it and add a new area rather than renaming it.'
        );
      }
    }
  }

  if (!nothingToChange(data)) {
    const updated = await unique('delivery area', () =>
      prisma.deliveryArea.updateMany({where: {id}, data})
    );
    if (updated.count !== 1) throw notFound('Delivery area');
  }

  const area = await prisma.deliveryArea.findUnique({where: {id}, select: areaShape});
  if (!area) throw notFound('Delivery area');
  return area;
}

// ------------------------------------------------------------ delivery slots

const slotShape = {
  id: true,
  areaId: true,
  date: true,
  windowStart: true,
  windowEnd: true,
  capacity: true,
  reserved: true
} as const;

const serializeSlot = <T extends {date: Date}>(slot: T) => ({...slot, date: dayKey(slot.date)});

function assertCapacityAboveReserved(capacity: number, reserved: number) {
  if (capacity < reserved) {
    throw new AdminError(
      'CONFLICT',
      409,
      `This slot already holds ${reserved} reserved, so its capacity cannot drop below that.`
    );
  }
}

export async function listSlots(from: string, to: string, areaId?: string) {
  const days = dateRange(from, to);
  const slots = await prisma.deliverySlot.findMany({
    where: {date: {gte: days[0], lte: days[days.length - 1]}, ...(areaId ? {areaId} : {})},
    orderBy: [{date: 'asc'}, {windowStart: 'asc'}],
    select: slotShape
  });
  return slots.map(serializeSlot);
}

export type SlotInput = {
  areaId: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  capacity: number;
};

export async function upsertSlot(data: SlotInput) {
  const area = await prisma.deliveryArea.findUnique({where: {id: data.areaId}, select: {id: true}});
  if (!area) throw notFound('Delivery area');

  const date = day(data.date);
  if (Number.isNaN(date.getTime())) throw new AdminError('VALIDATION_ERROR', 400, 'Invalid date.');

  const key = {areaId_date_windowStart: {areaId: data.areaId, date, windowStart: data.windowStart}};
  const existing = await prisma.deliverySlot.findUnique({where: key, select: {reserved: true}});
  if (existing) assertCapacityAboveReserved(data.capacity, existing.reserved);

  const slot = await prisma.deliverySlot.upsert({
    where: key,
    create: {...data, date},
    update: {windowEnd: data.windowEnd, capacity: data.capacity},
    select: slotShape
  });
  return serializeSlot(slot);
}

export async function updateSlot(id: string, capacity: number) {
  const slot = await prisma.deliverySlot.findUnique({where: {id}, select: slotShape});
  if (!slot) throw notFound('Delivery slot');
  assertCapacityAboveReserved(capacity, slot.reserved);
  return serializeSlot(
    await prisma.deliverySlot.update({where: {id}, data: {capacity}, select: slotShape})
  );
}

export async function deleteSlot(id: string) {
  const slot = await prisma.deliverySlot.findUnique({where: {id}, select: {reserved: true}});
  if (!slot) throw notFound('Delivery slot');
  if (slot.reserved > 0) {
    throw new AdminError('CONFLICT', 409, 'This slot has reservations against it and cannot be removed.');
  }
  await prisma.deliverySlot.delete({where: {id}});
}

export type SlotGeneration = {
  areaIds: string[];
  from: string;
  to: string;
  windows: {start: string; end: string}[];
  capacity: number;
  skipWeekdays?: number[];
};

export async function generateSlots(input: SlotGeneration) {
  const days = dateRange(input.from, input.to);
  const areas = await prisma.deliveryArea.findMany({
    where: {id: {in: input.areaIds}},
    select: {id: true}
  });
  if (areas.length !== new Set(input.areaIds).size) throw notFound('Delivery area');

  const skip = new Set(input.skipWeekdays ?? []);
  const dates = days.filter(date => !skip.has(date.getUTCDay()));
  let written = 0;
  let held = 0;

  for (const date of dates) {
    for (const area of areas) {
      for (const window of input.windows) {
        const key = {
          areaId_date_windowStart: {areaId: area.id, date, windowStart: window.start}
        };
        const existing = await prisma.deliverySlot.findUnique({where: key, select: {reserved: true}});
        // A slot the bakery has already sold into keeps whatever capacity it
        // has; a bulk fill must never invalidate a live reservation.
        if (existing && existing.reserved > input.capacity) {
          held++;
          continue;
        }
        await prisma.deliverySlot.upsert({
          where: key,
          create: {
            areaId: area.id,
            date,
            windowStart: window.start,
            windowEnd: window.end,
            capacity: input.capacity
          },
          update: {windowEnd: window.end, capacity: input.capacity}
        });
        written++;
      }
    }
  }

  return {written, held, days: dates.length};
}

// ---------------------------------------------------------- production capacity

/**
 * `ProductionCapacity.usedPoints` is the counter the order path guards against,
 * while availability sums the active reservations instead. The two are kept in
 * step, but a floor check should hold even if they ever drift, so the larger
 * figure wins.
 */
async function reservedPointsByDate(dates: Date[]) {
  const [capacities, reservations] = await Promise.all([
    prisma.productionCapacity.findMany({
      where: {date: {in: dates}},
      select: {id: true, date: true, totalPoints: true, usedPoints: true}
    }),
    prisma.capacityReservation.groupBy({
      by: ['date'],
      where: {date: {in: dates}, active: true},
      _sum: {points: true}
    })
  ]);

  const used = new Map(reservations.map(row => [row.date.getTime(), row._sum.points ?? 0]));
  for (const row of capacities) {
    const key = row.date.getTime();
    used.set(key, Math.max(row.usedPoints, used.get(key) ?? 0));
  }
  return {capacities, used};
}

export async function listCapacity(from: string, to: string) {
  const days = dateRange(from, to);
  const {capacities, used} = await reservedPointsByDate(days);
  const byDate = new Map(capacities.map(row => [row.date.getTime(), row]));

  return days.map(date => {
    const row = byDate.get(date.getTime());
    return {
      id: row?.id ?? null,
      date: dayKey(date),
      weekday: date.getUTCDay(),
      totalPoints: row?.totalPoints ?? null,
      usedPoints: used.get(date.getTime()) ?? 0
    };
  });
}

export async function setCapacity(dateValue: string, totalPoints: number) {
  const date = day(dateValue);
  if (Number.isNaN(date.getTime())) throw new AdminError('VALIDATION_ERROR', 400, 'Invalid date.');

  const {used} = await reservedPointsByDate([date]);
  const reserved = used.get(date.getTime()) ?? 0;
  if (totalPoints < reserved) {
    throw new AdminError(
      'CONFLICT',
      409,
      `${dayKey(date)} already has ${reserved} points reserved, so its total cannot drop below that.`
    );
  }

  const row = await prisma.productionCapacity.upsert({
    where: {date},
    create: {date, totalPoints},
    update: {totalPoints},
    select: {id: true, date: true, totalPoints: true, usedPoints: true}
  });
  return {...row, date: dayKey(row.date)};
}

export async function setCapacityRange(
  from: string,
  to: string,
  totalPoints: number,
  skipWeekdays: number[] = []
) {
  const days = dateRange(from, to);
  const skip = new Set(skipWeekdays);
  const dates = days.filter(date => !skip.has(date.getUTCDay()));
  const {used} = await reservedPointsByDate(dates);

  const held: string[] = [];
  let written = 0;
  for (const date of dates) {
    // Days already committed beyond the new total keep their existing figure
    // rather than being pushed below what the bakery has promised to make.
    if ((used.get(date.getTime()) ?? 0) > totalPoints) {
      held.push(dayKey(date));
      continue;
    }
    await prisma.productionCapacity.upsert({
      where: {date},
      create: {date, totalPoints},
      update: {totalPoints}
    });
    written++;
  }
  return {written, held};
}

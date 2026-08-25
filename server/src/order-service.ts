import {randomBytes} from 'node:crypto';
import {prisma} from './db.js';
import {calculateAvailability} from './availability-service.js';
import {cartSubtotalFils, type CartLine} from './cart-service.js';

type OrderRequest = {
  items: CartLine[];
  area: string;
  selectedSlot: {date: string; window: string};
  customer: {name: string; phone: string; email?: string};
  address: {
    governorate: string;
    area: string;
    block: string;
    street: string;
    building: string;
    floor?: string;
    instructions?: string;
  };
  gift?: {
    isGift: boolean;
    recipientName?: string;
    recipientPhone?: string;
    message?: string;
    anonymous?: boolean;
  };
};

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const slotUnavailable = 'The selected delivery slot is no longer available.';

/** Attempts, including the first, before a write conflict is given up on. */
const maxAttempts = 4;

export class OrderConflictError extends Error {}

/**
 * Postgres aborts a Serializable transaction when a concurrent one touched the
 * same rows. Two customers reserving the same day is expected traffic, not an
 * error, so the losing transaction is retried rather than surfaced as a 500.
 */
function isWriteConflict(error: unknown) {
  const code = (error as {code?: string} | null)?.code;
  // P2034 is Prisma's write-conflict/deadlock code; 40001 and 40P01 are the
  // underlying Postgres serialization_failure and deadlock_detected.
  return code === 'P2034' || code === '40001' || code === '40P01';
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function createReservedOrder(input: OrderRequest) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await reserveOnce(input);
    } catch (error) {
      if (!isWriteConflict(error)) throw error;
      // Persistent contention is a capacity conflict from the customer's point
      // of view, not an internal failure.
      if (attempt >= maxAttempts) throw new OrderConflictError(slotUnavailable);
      // Stagger the retries so two colliding checkouts do not line up again.
      await wait(attempt * 25);
    }
  }
}

async function reserveOnce(input: OrderRequest) {
  // Prices, capacity and options are all resolved server-side from the stored
  // cart; nothing about the money or the reservation comes from the request.
  const availability = await calculateAvailability(input.items, input.area);
  if (availability.unavailable || !availability.earliestSlot) {
    throw new OrderConflictError(availability.reason ?? 'No delivery capacity.');
  }

  const slotIsOffered = availability.availableSlots.some(
    slot => slot.date === input.selectedSlot.date && slot.window === input.selectedSlot.window
  );
  if (!slotIsOffered) throw new OrderConflictError(slotUnavailable);

  const lines = availability.lines;
  const subtotal = cartSubtotalFils(lines);
  const [windowStart, windowEnd] = input.selectedSlot.window.split('–');
  const date = day(input.selectedSlot.date);

  return prisma.$transaction(async tx => {
    const area = await tx.deliveryArea.findFirst({where: {nameEn: input.area, active: true}});
    const production = await tx.productionCapacity.findUnique({where: {date}});
    const slot = area
      ? await tx.deliverySlot.findFirst({where: {areaId: area.id, date, windowStart, windowEnd}})
      : null;
    if (!area || !production || !slot) throw new OrderConflictError(slotUnavailable);

    const productionUpdated = await tx.productionCapacity.updateMany({
      where: {id: production.id, usedPoints: {lte: production.totalPoints - availability.capacityPoints}},
      data: {usedPoints: {increment: availability.capacityPoints}}
    });
    const slotUpdated = await tx.deliverySlot.updateMany({
      where: {id: slot.id, reserved: {lt: slot.capacity}},
      data: {reserved: {increment: 1}}
    });
    if (productionUpdated.count !== 1 || slotUpdated.count !== 1) throw new OrderConflictError(slotUnavailable);

    const customerEmail = input.customer.email?.trim().toLowerCase();
    const existingUser = customerEmail
      ? await tx.user.findUnique({where: {email: customerEmail}, select: {id: true, role: true}})
      : null;
    const user = customerEmail
      ? existingUser?.role === 'CUSTOMER'
        ? await tx.user.update({
            where: {id: existingUser.id},
            data: {name: input.customer.name},
            select: {id: true}
          })
        : existingUser
          ? null
          : await tx.user.create({
              data: {email: customerEmail, name: input.customer.name},
              select: {id: true}
            })
      : null;

    if (user) {
      await tx.customerAddress.create({
        data: {
          userId: user.id,
          governorate: input.address.governorate,
          areaName: area.nameEn,
          block: input.address.block,
          street: input.address.street,
          building: input.address.building,
          floorOrApartment: input.address.floor || null,
          deliveryInstructions: input.address.instructions || null
        }
      });
    }

    return tx.order.create({
      data: {
        publicNumber: `OB-${randomBytes(4).toString('hex').toUpperCase()}`,
        trackingToken: randomBytes(24).toString('base64url'),
        userId: user?.id ?? null,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        governorate: input.address.governorate,
        areaName: area.nameEn,
        block: input.address.block,
        street: input.address.street,
        building: input.address.building,
        floorOrApartment: input.address.floor || null,
        deliveryInstructions: input.address.instructions || null,
        isGift: input.gift?.isGift ?? false,
        giftRecipientName: input.gift?.isGift ? input.gift.recipientName || null : null,
        giftRecipientPhone: input.gift?.isGift ? input.gift.recipientPhone || null : null,
        giftMessage: input.gift?.isGift ? input.gift.message || null : null,
        giftAnonymous: input.gift?.isGift ? input.gift.anonymous ?? false : false,
        deliveryWindow: input.selectedSlot.window,
        subtotalFils: subtotal,
        deliveryFeeFils: area.feeFils,
        totalFils: subtotal + area.feeFils,
        capacityPoints: availability.capacityPoints,
        items: {
          // Snapshots, not references: what the bakery reads must not change if
          // the catalog is edited after the order is placed.
          create: lines.map(line => ({
            productNameEn: line.product.nameEn,
            productNameAr: line.product.nameAr,
            variantName: line.variant?.nameEn ?? null,
            selectedAddons: line.addons.map(addon => ({
              nameEn: addon.nameEn,
              nameAr: addon.nameAr,
              priceFils: addon.priceFils
            })),
            unitPriceFils: line.unitPriceFils,
            quantity: line.quantity,
            capacityPoints: line.unitCapacityPoints * line.quantity,
            cakeText: line.cakeText,
            allergens: line.product.allergens,
            imageUrl: line.product.imageUrl
          }))
        },
        reservation: {create: {date, points: availability.capacityPoints}}
      },
      select: {publicNumber: true, trackingToken: true, status: true}
    });
  }, {isolationLevel: 'Serializable'});
}

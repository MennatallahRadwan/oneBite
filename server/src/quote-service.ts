import {prisma} from './db.js';
import type {CartLine} from './cart-service.js';

/** How long a quoted price and slot list stays honourable. */
const quoteTtlMs = 900000;

/** Consumed and expired quotes are swept once they are this old. */
const retentionMs = 24 * 60 * 60 * 1000;

export type StoredQuote = {items: CartLine[]; areaName: string};

export async function createQuote(items: CartLine[], areaName: string) {
  // Opportunistic sweep: cheap, indexed, and keeps the table from growing
  // without needing a scheduled job.
  await prisma.quote.deleteMany({
    where: {expiresAt: {lt: new Date(Date.now() - retentionMs)}}
  });

  return prisma.quote.create({
    data: {
      areaName,
      items: items as object[],
      expiresAt: new Date(Date.now() + quoteTtlMs)
    },
    select: {id: true, expiresAt: true}
  });
}

/**
 * Claims a quote for order creation, returning null if it is unknown, expired
 * or already used.
 *
 * The claim is a conditional update rather than a read followed by a delete, so
 * two requests arriving with the same quote id cannot both pass the check and
 * place an order. The quote stays consumed even if order creation then fails:
 * whatever made it fail — a taken slot, exhausted capacity — means the prices
 * and slots it was holding need recalculating anyway.
 */
export async function claimQuote(id: string): Promise<StoredQuote | null> {
  const claimed = await prisma.quote.updateMany({
    where: {id, consumedAt: null, expiresAt: {gt: new Date()}},
    data: {consumedAt: new Date()}
  });
  if (claimed.count !== 1) return null;

  const quote = await prisma.quote.findUniqueOrThrow({
    where: {id},
    select: {items: true, areaName: true}
  });
  return {items: quote.items as CartLine[], areaName: quote.areaName};
}

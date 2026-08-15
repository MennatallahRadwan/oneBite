import {prisma} from './db.js';

export type CartLine = {slug: string; quantity: number};

type Availability = {
  unavailable: boolean;
  reason?: string;
  capacityPoints: number;
  earliestSlot: {date: string; window: string; area: string} | null;
  availableSlots: {date: string; window: string}[];
  items: {slug: string; priceFils: number; capacityPoints: number}[];
};

const horizonDays = 30;
const defaultProductionPoints = 60;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const startOfDay = (date: Date) => new Date(`${dayKey(date)}T00:00:00.000Z`);

function unavailableResult(reason: string, capacityPoints = 0): Availability {
  return {unavailable: true, reason, capacityPoints, earliestSlot: null, availableSlots: [], items: []};
}

export async function calculateAvailability(lines: CartLine[], areaName: string): Promise<Availability> {
  const products = await prisma.product.findMany({
    where: {slug: {in: lines.map(line => line.slug)}, published: true, active: true, archivedAt: null},
    select: {slug: true, priceFils: true, capacityPoints: true, leadDays: true}
  });
  if (products.length !== new Set(lines.map(line => line.slug)).size) {
    return unavailableResult('Temporarily unavailable.');
  }

  const bySlug = new Map(products.map(product => [product.slug, product]));
  const items = lines.map(line => ({slug: line.slug, quantity: line.quantity, product: bySlug.get(line.slug)!}));
  const capacityPoints = items.reduce((total, item) => total + item.quantity * item.product.capacityPoints, 0);
  const leadDays = Math.max(...items.map(item => item.product.leadDays));

  const area = await prisma.deliveryArea.findFirst({where: {nameEn: areaName, active: true}});
  if (!area) return unavailableResult('Temporarily unavailable.', capacityPoints);

  const availableSlots: {date: string; window: string}[] = [];
  for (let offset = leadDays; offset < horizonDays; offset++) {
    const candidate = new Date();
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    if (candidate.getUTCDay() === 5) continue;

    const date = startOfDay(candidate);
    const [capacity, reservations, slots] = await Promise.all([
      prisma.productionCapacity.findUnique({where: {date}}),
      prisma.capacityReservation.aggregate({where: {date, active: true}, _sum: {points: true}}),
      prisma.deliverySlot.findMany({where: {areaId: area.id, date}, orderBy: {windowStart: 'asc'}})
    ]);

    const totalPoints = capacity?.totalPoints ?? defaultProductionPoints;
    if ((reservations._sum.points ?? 0) + capacityPoints > totalPoints) continue;

    for (const slot of slots.filter(slot => slot.reserved < slot.capacity)) {
      availableSlots.push({date: dayKey(date), window: `${slot.windowStart}–${slot.windowEnd}`});
    }
  }

  return {
    unavailable: false,
    capacityPoints,
    earliestSlot: availableSlots[0] ? {...availableSlots[0], area: areaName} : null,
    availableSlots,
    items: items.map(item => ({
      slug: item.slug,
      priceFils: item.product.priceFils,
      capacityPoints: item.product.capacityPoints
    }))
  };
}

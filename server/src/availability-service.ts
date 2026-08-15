import {prisma} from './db.js';
import {
  cartCapacityPoints,
  cartLeadDays,
  CartError,
  resolveCartLines,
  type CartLine,
  type ResolvedLine
} from './cart-service.js';

export type {CartLine} from './cart-service.js';

type Availability = {
  unavailable: boolean;
  reason?: string;
  capacityPoints: number;
  earliestSlot: {date: string; window: string; area: string} | null;
  availableSlots: {date: string; window: string}[];
  lines: ResolvedLine[];
};

const horizonDays = 30;
const defaultProductionPoints = 60;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const startOfDay = (date: Date) => new Date(`${dayKey(date)}T00:00:00.000Z`);

function unavailableResult(reason: string, capacityPoints = 0): Availability {
  return {
    unavailable: true,
    reason,
    capacityPoints,
    earliestSlot: null,
    availableSlots: [],
    lines: []
  };
}

export async function calculateAvailability(
  cart: CartLine[],
  areaName: string
): Promise<Availability> {
  let lines: ResolvedLine[];
  try {
    lines = await resolveCartLines(cart);
  } catch (error) {
    // An unknown product reads as sold out to the customer; a bad option id
    // is a client error and is re-thrown for the route to report as one.
    if (error instanceof CartError && error.message === 'Temporarily unavailable.') {
      return unavailableResult(error.message);
    }
    throw error;
  }

  const capacityPoints = cartCapacityPoints(lines);
  const leadDays = cartLeadDays(lines);

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
    lines
  };
}

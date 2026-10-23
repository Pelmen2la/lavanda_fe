import type { Booking, Busy, Workplace } from './api';

export function placeInterval(booking: Busy | Booking, place: Pick<Workplace, 'id'>, clientId?: number): Busy | Booking {
  const blockedByName = 'clientId' in booking && booking.workplaceId !== place.id
    ? booking.workplaceName : booking.blockedByName;
  const own = !blockedByName && ('clientId' in booking ? booking.clientId === clientId : !!booking.own);
  return { ...booking, blockedByName, own, booked: 'clientId' in booking || booking.booked };
}

export function placeResources(place: Pick<Workplace, 'id' | 'resourceIds'>): number[] {
  return place.resourceIds?.length ? place.resourceIds : [place.id];
}

export function bookingBlocksPlace(booking: Busy & { resourceIds?: number[] }, place: Pick<Workplace, 'id' | 'resourceIds'>): boolean {
  // Public availability is already projected by the API onto each affected place.
  if (!booking.resourceIds?.length) return booking.workplaceId === place.id;
  const resources = placeResources(place);
  return booking.resourceIds.some(id => resources.includes(id));
}

export function overlappingPlaces(places: Pick<Workplace, 'id' | 'resourceIds'>[]): boolean {
  const used = new Set<number>();
  for (const place of places) for (const id of placeResources(place)) {
    if (used.has(id)) return true;
    used.add(id);
  }
  return false;
}

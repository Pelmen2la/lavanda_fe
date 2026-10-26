import type { Booking } from './api';

export function bookingsTotal(bookings: Pick<Booking, 'start' | 'end' | 'hourlyPrice' | 'cancelledAt'>[]) {
  return bookings.reduce((total, booking) => booking.cancelledAt ? total : total + Math.round((Date.parse(booking.end) - Date.parse(booking.start)) / 3600000 * booking.hourlyPrice), 0);
}

export function groupBookings(bookings: Booking[]) {
  const days = new Map<string, { date: string; places: Map<number, { id: number; name: string; bookings: Booking[] }> }>();
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' });
  for (const booking of [...bookings].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.id - b.id)) {
    const date = formatter.format(new Date(booking.start));
    if (!days.has(date)) days.set(date, { date, places: new Map() });
    const day = days.get(date)!;
    if (!day.places.has(booking.workplaceId)) day.places.set(booking.workplaceId, { id: booking.workplaceId, name: booking.workplaceName, bookings: [] });
    day.places.get(booking.workplaceId)!.bookings.push(booking);
  }
  return Array.from(days.values(), day => ({ date: day.date, places: Array.from(day.places.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru') || a.id - b.id) }));
}

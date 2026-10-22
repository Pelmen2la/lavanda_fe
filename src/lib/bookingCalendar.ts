import type { Booking } from './api';

export function shiftDay(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function weekDays(date: string): string[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return Array.from({ length: 7 }, (_, i) => shiftDay(date, i - (weekday + 6) % 7));
}

export function calendarBookings(date: string, bookings: Booking[]) {
  const start = Date.parse(`${date}T09:00:00+03:00`);
  const end = start + 12 * 60 * 60000;
  return bookings.filter(b => !b.cancelledAt && Date.parse(b.start) < end && Date.parse(b.end) > start)
    .map(booking => ({ booking, minute: (Math.max(start, Date.parse(booking.start)) - start) / 60000,
      duration: (Math.min(end, Date.parse(booking.end)) - Math.max(start, Date.parse(booking.start))) / 60000 }))
    .sort((a, b) => a.minute - b.minute || a.booking.id - b.booking.id);
}

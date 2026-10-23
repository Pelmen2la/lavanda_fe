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

// Several independent places can be occupied at once inside a whole-room column.
export function calendarLanes<T extends { minute: number; duration: number }>(entries: T[]) {
  const result: (T & { lane: number; lanes: number })[] = [];
  let group: (T & { lane: number; lanes: number })[] = [];
  let ends: number[] = [];
  let groupEnd = -Infinity;
  function flush() { for (const entry of group) entry.lanes = ends.length; result.push(...group); group = []; ends = []; }
  for (const entry of [...entries].sort((a, b) => a.minute - b.minute)) {
    if (entry.minute >= groupEnd) flush();
    let lane = ends.findIndex(end => end <= entry.minute);
    if (lane < 0) lane = ends.length;
    ends[lane] = entry.minute + entry.duration;
    groupEnd = Math.max(...ends);
    group.push({ ...entry, lane, lanes: 1 });
  }
  flush();
  return result;
}

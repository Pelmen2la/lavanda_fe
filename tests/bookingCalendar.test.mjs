import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/bookingCalendar.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { shiftDay, weekDays, calendarBookings } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('week navigation crosses month and year boundaries and starts on Monday', () => {
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDay('2028-03-01', -1), '2028-02-29');
  assert.deepEqual(weekDays('2027-01-03'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});

test('places bookings in Moscow hours, clips boundaries and excludes cancellations and other days', () => {
  const bookings = [
    { id: 1, start: '2026-10-22T06:15:00Z', end: '2026-10-22T06:45:00Z' },
    { id: 2, start: '2026-10-22T08:30:00+03:00', end: '2026-10-22T09:30:00+03:00' },
    { id: 3, start: '2026-10-22T20:30:00+03:00', end: '2026-10-22T21:30:00+03:00' },
    { id: 4, start: '2026-10-22T10:00:00+03:00', end: '2026-10-22T11:00:00+03:00', cancelledAt: '2026-10-21' },
    { id: 5, start: '2026-10-23T10:00:00+03:00', end: '2026-10-23T11:00:00+03:00' },
  ];
  assert.deepEqual(calendarBookings('2026-10-22', bookings).map(e => [e.booking.id, e.minute, e.duration]), [[2, 0, 30], [1, 15, 30], [3, 690, 30]]);
  assert.equal(bookings[0].id, 1);
  assert.deepEqual(calendarBookings('2026-10-22', []), []);
});

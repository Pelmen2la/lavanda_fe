import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/timeline.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { timeline, timelineTime } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const date = '2026-10-16';
const interval = (start, end) => ({ start: `${date}T${start}:00+03:00`, end: `${date}T${end}:00+03:00` });

test('direct booking is marked for primary color regardless of ownership', () => {
  for (const own of [false, true]) {
    const busy = timeline(date, [{ ...interval('13:00', '17:00'), booked: true, own }]).find(s => s.busy);
    assert.equal(busy.direct, true);
    const linked = timeline(date, [{ ...interval('13:00', '17:00'), booked: true, own, blockedByName: 'Кабинет' }]).find(s => s.busy);
    assert.equal(linked.direct, undefined);
    assert.equal(linked.own, undefined);
  }
});

test('direct booking boundaries remain distinct inside a master reservation', () => {
  const segments = timeline(date, [interval('09:00', '21:00'), { ...interval('13:00', '17:00'), booked: true }]);
  assert.deepEqual(segments, [
    { start: 0, end: 240, busy: true },
    { start: 240, end: 480, busy: true, direct: true },
    { start: 480, end: 720, busy: true },
  ]);
});

test('a booking through a room is occupied rather than own-colored on a linked place', () => {
  const segments = timeline(date, [{ ...interval('10:00', '11:00'), own: true, blockedByName: 'Весь кабинет' }]);
  assert.deepEqual(segments, [
    { start: 0, end: 60, busy: false }, { start: 60, end: 120, busy: true }, { start: 120, end: 720, busy: false },
  ]);
});

test('linked booking boundaries are preserved for the correct tooltip names', () => {
  const segments = timeline(date, [
    { ...interval('10:00', '12:00'), blockedByName: 'Кресло' },
    { ...interval('11:00', '13:00'), blockedByName: 'Кушетка' },
  ]);
  assert.deepEqual(segments.filter(s => s.busy).map(s => [s.start, s.end]), [[60, 120], [120, 180], [180, 240]]);
});

test('own booking keeps its color inside a day reservation and after it ends', () => {
  const segments = timeline(date, [interval('09:00', '21:00'), { ...interval('10:00', '11:00'), own: true }], Date.parse(`${date}T22:00:00+03:00`));
  assert.deepEqual(segments, [
    { start: 0, end: 60, busy: true, past: true },
    { start: 60, end: 120, busy: true, own: true, past: true },
    { start: 120, end: 720, busy: true, past: true },
  ]);
});

test('empty day is free from 09:00 until 21:00', () => {
  assert.deepEqual(timeline(date, []), [{ start: 0, end: 720, busy: false }]);
  assert.equal(timelineTime(0), '09:00');
  assert.equal(timelineTime(720), '21:00');
});
test('unsorted, overlapping and adjacent bookings merge with free gaps', () => {
  assert.deepEqual(timeline(date, [interval('11:00', '12:00'), interval('10:00', '11:00'), interval('10:30', '11:30')]), [
    { start: 0, end: 60, busy: false }, { start: 60, end: 180, busy: true }, { start: 180, end: 720, busy: false },
  ]);
});
test('timestamps use Moscow boundaries and are clipped to working hours', () => {
  assert.deepEqual(timeline(date, [{ start: `${date}T05:00:00Z`, end: `${date}T19:00:00Z` }]), [{ start: 0, end: 720, busy: true }]);
  assert.deepEqual(timeline(date, [interval('07:00', '08:00')]), [{ start: 0, end: 720, busy: false }]);
});

test('elapsed time splits both occupied and free intervals at current Moscow minute', () => {
  assert.deepEqual(timeline(date, [interval('10:00', '12:00')], Date.parse(`${date}T08:15:00Z`)), [
    { start: 0, end: 60, busy: false, past: true },
    { start: 60, end: 135, busy: true, past: true },
    { start: 135, end: 180, busy: true },
    { start: 180, end: 720, busy: false },
  ]);
  assert.deepEqual(timeline(date, [], Date.parse(`${date}T10:30:00+03:00`)), [
    { start: 0, end: 90, busy: false, past: true }, { start: 90, end: 720, busy: false },
  ]);
});

test('before opening nothing is past; after closing the whole day is past', () => {
  assert.deepEqual(timeline(date, [], Date.parse(`${date}T08:00:00+03:00`)), [{ start: 0, end: 720, busy: false }]);
  assert.deepEqual(timeline(date, [], Date.parse(`${date}T22:00:00+03:00`)), [{ start: 0, end: 720, busy: false, past: true }]);
});

test('adjacent bookings stay separate, including after both have elapsed', () => {
  const intervals = [interval('10:00', '11:00'), interval('11:00', '12:00')];
  assert.deepEqual(timeline(date, intervals).filter(s => s.busy), [
    { start: 60, end: 120, busy: true }, { start: 120, end: 180, busy: true },
  ]);
  assert.deepEqual(timeline(date, intervals, Date.parse(`${date}T13:00:00+03:00`)).filter(s => s.busy), [
    { start: 60, end: 120, busy: true, past: true }, { start: 120, end: 180, busy: true, past: true },
  ]);
});

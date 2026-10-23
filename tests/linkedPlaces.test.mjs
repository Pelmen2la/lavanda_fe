import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/linkedPlaces.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { bookingBlocksPlace, overlappingPlaces, placeInterval } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const chair = { id: 1, resourceIds: [1] };
const couch = { id: 2, resourceIds: [2] };
const room = { id: 3, resourceIds: [1, 2, 3] };
test('admin child booking is own only on the child, while room shows its source', () => {
  const booking = { workplaceId: 1, workplaceName: 'Кресло', clientId: 7, resourceIds: [1] };
  assert.equal(placeInterval(booking, chair, 7).own, true);
  const blocked = placeInterval(booking, room, 7);
  assert.equal(blocked.own, false);
  assert.equal(blocked.blockedByName, 'Кресло');
});
test('projected public availability keeps the child name and clears inherited ownership', () => {
  const blocked = placeInterval({ workplaceId: 3, blockedByName: 'Кушетка', own: true }, room, 7);
  assert.equal(blocked.blockedByName, 'Кушетка');
  assert.equal(blocked.own, false);
});
test('admin room booking blocks a child without inheriting client ownership', () => {
  const blocked = placeInterval({ workplaceId: 3, workplaceName: 'Кабинет', clientId: 7 }, chair, 7);
  assert.equal(blocked.blockedByName, 'Кабинет');
  assert.equal(blocked.own, false);
});
test('room conflicts with each child but separate children are independent', () => {
  const chairBooking = { workplaceId: 1, resourceIds: [1] };
  const roomBooking = { workplaceId: 3, resourceIds: [1, 2, 3] };
  assert.equal(bookingBlocksPlace(chairBooking, room), true);
  assert.equal(bookingBlocksPlace(chairBooking, couch), false);
  assert.equal(bookingBlocksPlace(roomBooking, chair), true);
  assert.equal(bookingBlocksPlace(roomBooking, couch), true);
  assert.equal(overlappingPlaces([room, chair]), true);
  assert.equal(overlappingPlaces([chair, couch]), false);
});
test('already projected public availability is not expanded a second time', () => {
  assert.equal(bookingBlocksPlace({ workplaceId: 3 }, room), true);
  assert.equal(bookingBlocksPlace({ workplaceId: 3 }, couch), false);
});

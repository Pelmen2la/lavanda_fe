import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/bookingGroups.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { groupBookings } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('groups by Moscow day and workplace identity, sorting intervals chronologically', () => {
  const bookings = [
    { id: 3, start: '2026-10-20T10:00:00Z', workplaceId: 1, workplaceName: 'Место' },
    { id: 2, start: '2026-10-19T22:00:00Z', workplaceId: 2, workplaceName: 'Место' },
    { id: 1, start: '2026-10-19T08:00:00Z', workplaceId: 1, workplaceName: 'Место' },
    { id: 4, start: '2026-10-20T08:00:00Z', workplaceId: 1, workplaceName: 'Место' },
  ];
  const days = groupBookings(bookings);
  assert.deepEqual(days.map(d => d.date), ['2026-10-19', '2026-10-20']);
  assert.deepEqual(days[1].places.map(p => p.id), [1, 2]);
  assert.deepEqual(days[1].places[0].bookings.map(b => b.id), [4, 3]);
  assert.equal(bookings[0].id, 3);
  assert.deepEqual(groupBookings([]), []);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/validation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { validateClient, validatePlace } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const client = { name: 'Анна', email: '', phone: '', note: '', role: 'client', reserveWorkdays: false, workDays: [], workplaceIds: [] };
test('only the name is required for a client', () => {
  assert.deepEqual(validateClient(client), {});
  assert.ok(validateClient({ ...client, name: '  ' }).name);
});
test('optional contacts must be complete when supplied', () => {
  assert.ok(validateClient({ ...client, email: 'invalid' }).email);
  assert.ok(validateClient({ ...client, phone: '+7 (999)' }).phone);
  assert.deepEqual(validateClient({ ...client, email: 'anna@example.test', phone: '+7 (999) 123-45-67' }), {});
});
test('master reservation requires places and weekdays', () => {
  const master = { ...client, role: 'master', reserveWorkdays: true };
  assert.ok(validateClient(master).workDays);
  assert.ok(validateClient(master).workplaceIds);
  assert.deepEqual(validateClient({ ...master, workDays: [1], workplaceIds: [3] }), {});
});
test('price rejects empty, negative, excessive and overprecise amounts', () => {
  for (const price of ['', '0', '-1', '100001', '1.001', 'NaN']) assert.ok(validatePlace({ name: 'Стол', description: '', price }).price);
  for (const price of ['0.01', '500', '100000', '12,50']) assert.deepEqual(validatePlace({ name: 'Стол', description: '', price }), {});
});
test('text limits match backend for Cyrillic input', () => {
  assert.ok(validateClient({ ...client, name: 'я'.repeat(101) }).name);
  assert.ok(validatePlace({ name: 'Стол', description: 'я'.repeat(2001), price: '500' }).description);
});

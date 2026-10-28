import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/preparePhoto.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { preparePhoto, validatePhotoFile } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const originalImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalCreateURL = URL.createObjectURL;
const originalRevokeURL = URL.revokeObjectURL;
afterEach(() => {
  if (originalImage) Object.defineProperty(globalThis, 'Image', originalImage); else delete globalThis.Image;
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else delete globalThis.document;
  URL.createObjectURL = originalCreateURL;
  URL.revokeObjectURL = originalRevokeURL;
});

const file = (overrides = {}) => ({ name: 'photo.jpg', type: 'image/jpeg', size: 500000, ...overrides });

function mockBrowser({ width = 4032, height = 3024, decodeFails = false, contextMissing = false, encodedSizes = [100000], encodedType = 'image/jpeg', encodeFails = false } = {}) {
  const state = { created: [], revoked: [], images: [], encodings: [], operations: [] };
  URL.createObjectURL = value => { state.created.push(value); return 'blob:test-photo'; };
  URL.revokeObjectURL = url => state.revoked.push(url);
  globalThis.Image = class {
    naturalWidth = width;
    naturalHeight = height;
    removed = [];
    constructor() { state.images.push(this); }
    set src(value) {
      this.source = value;
      queueMicrotask(() => decodeFails ? this.onerror?.() : this.onload?.());
    }
    removeAttribute(name) { this.removed.push(name); this.source = undefined; }
  };
  const context = {
    fillStyle: '',
    fillRect(...args) { state.operations.push({ kind: 'fill', color: this.fillStyle, args }); },
    drawImage(...args) { state.operations.push({ kind: 'draw', args }); },
  };
  const canvas = {
    width: 0, height: 0,
    getContext(kind) { assert.equal(kind, '2d'); return contextMissing ? null : context; },
    toBlob(callback, type, quality) {
      const size = encodedSizes[Math.min(state.encodings.length, encodedSizes.length - 1)];
      state.encodings.push({ width: this.width, height: this.height, type, quality });
      callback(encodeFails ? null : new Blob([new Uint8Array(size)], { type: encodedType }));
    },
  };
  globalThis.document = { createElement: name => { assert.equal(name, 'canvas'); return canvas; } };
  state.canvas = canvas;
  return state;
}

function assertCleanedUp(state) {
  assert.deepEqual(state.revoked, ['blob:test-photo']);
  assert.equal(state.canvas.width, 0);
  assert.equal(state.canvas.height, 0);
  assert.equal(state.images[0].onload, null);
  assert.equal(state.images[0].onerror, null);
  assert.deepEqual(state.images[0].removed, ['src']);
}

test('landscape photo is reduced to 1920 by 1440 and encoded as JPEG on white', async () => {
  const state = mockBrowser();
  const result = await preparePhoto(file());
  assert.deepEqual(state.encodings, [{ width: 1920, height: 1440, type: 'image/jpeg', quality: 0.82 }]);
  assert.equal(result.type, 'image/jpeg');
  assert.equal(result.size, 100000);
  assert.deepEqual(state.operations[0], { kind: 'fill', color: '#ffffff', args: [0, 0, 1920, 1440] });
  assert.equal(state.operations[1].kind, 'draw');
  assertCleanedUp(state);
});

test('portrait preserves its aspect ratio and small images are not enlarged', async () => {
  for (const [width, height, expected] of [[3024, 4032, [1440, 1920]], [800, 600, [800, 600]], [1, 8000, [1, 1920]]]) {
    const state = mockBrowser({ width, height });
    await preparePhoto(file());
    assert.deepEqual([state.encodings[0].width, state.encodings[0].height], expected);
    assertCleanedUp(state);
  }
});

test('oversized JPEG output reduces dimensions repeatedly until no larger than 1 MiB', async () => {
  const limit = 1024 * 1024;
  const state = mockBrowser({ encodedSizes: [limit + 100, limit + 1, limit] });
  const result = await preparePhoto(file());
  assert.equal(result.size, limit);
  assert.deepEqual(state.encodings.map(({ width, height }) => [width, height]), [[1920, 1440], [1536, 1152], [1229, 922]]);
  assert.ok(state.encodings.every(encoding => encoding.type === 'image/jpeg' && encoding.quality === 0.82));
  assertCleanedUp(state);
});

test('uncompressible and zero-length encoder output are rejected without falling back to original', async () => {
  for (const size of [1024 * 1024 + 1, 0]) {
    const state = mockBrowser({ encodedSizes: [size] });
    await assert.rejects(preparePhoto(file()), /Не удалось уменьшить фото до 1 МБ/);
    assert.equal(state.encodings.length, 6);
    assertCleanedUp(state);
  }
});

test('decode, unknown dimensions, missing canvas context and encoder failures clean up resources', async () => {
  for (const [options, message] of [
    [{ decodeFails: true }, /Не удалось открыть фото/],
    [{ width: 0 }, /Не удалось определить размер/],
    [{ contextMissing: true }, /Браузер не смог обработать фото/],
    [{ encodeFails: true }, /Не удалось сжать фотографию/],
    [{ encodedType: 'image/png' }, /не поддерживает подготовку JPEG/],
  ]) {
    const state = mockBrowser(options);
    await assert.rejects(preparePhoto(file()), message);
    assertCleanedUp(state);
  }
});

test('empty MIME with uppercase JPEG extension is decoded, while an oversized source is rejected before decoding', async () => {
  const state = mockBrowser();
  const jpeg = file({ name: 'MAX-image.JPEG', type: '' });
  assert.equal(validatePhotoFile(jpeg), '');
  await preparePhoto(jpeg);
  assert.equal(state.created[0], jpeg);
  assertCleanedUp(state);
  const oversized = file({ size: 20 * 1024 * 1024 + 1 });
  assert.match(validatePhotoFile(oversized), /до 20 МБ/);
  await assert.rejects(preparePhoto(oversized), /до 20 МБ/);
  assert.equal(state.created.length, 1);
});

test('unsupported source types and empty files are rejected before browser decoding', async () => {
  const state = mockBrowser();
  for (const invalid of [file({ type: 'image/heic', name: 'photo.heic' }), file({ type: 'text/html', name: 'photo.jpeg' }), file({ type: '', name: 'photo.unknown' }), file({ size: 0 })]) {
    assert.notEqual(validatePhotoFile(invalid), '');
    await assert.rejects(preparePhoto(invalid), /Выберите JPEG, PNG или WebP/);
  }
  assert.equal(state.created.length, 0);
  assert.equal(state.images.length, 0);
});

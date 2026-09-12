import assert from 'node:assert/strict';
import { ScreenRecordFrameSource } from '../systems/visual/ScreenRecordFrameSource.js';
let binding = { offscreen: true };
const prior = binding;
let output;
let reads = 0;
const context = {
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: frame => { output = [...frame.data]; },
};
const originalDocument = globalThis.document;
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const gl = {
  drawingBufferWidth: 1, drawingBufferHeight: 2,
  FRAMEBUFFER_BINDING: 1, FRAMEBUFFER: 2, RGBA: 3, UNSIGNED_BYTE: 4,
  isContextLost: () => false,
  getParameter: () => binding,
  bindFramebuffer: (_, next) => { binding = next; },
  readPixels: (x, y, w, h, format, type, pixels) => {
    assert.equal(binding, null);
    reads++;
    pixels.set([0, 0, 255, 255, 255, 0, 0, 255]);
  },
};
try {
  const source = new ScreenRecordFrameSource({ gl });
  const canvas = source.read({});
  assert.deepEqual(output, [255, 0, 0, 255, 0, 0, 255, 255]);
  assert.equal(binding, prior);
  const pixels = source.pixels;
  assert.equal(source.read({}), canvas);
  assert.equal(source.pixels, pixels);
  gl.isContextLost = () => true;
  assert.equal(source.read({}), null);
  assert.equal(reads, 2);
  gl.isContextLost = () => false;
  gl.readPixels = () => { throw new Error('read failure'); };
  assert.throws(() => source.read({}), /read failure/);
  assert.equal(binding, prior);
  const plainCanvas = {};
  assert.equal(new ScreenRecordFrameSource(null).read(plainCanvas), plainCanvas);
} finally { globalThis.document = originalDocument; }
console.log('Framebuffer capture: orientation, binding restoration, buffer reuse, context loss and Canvas fallback passed');

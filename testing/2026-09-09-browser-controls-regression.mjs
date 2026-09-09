import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/import .*?;\s*/, '');
const { BROWSER_CONTROLS } = await import('../values/browserControls.js');
async function fullscreenCase(keyboard) {
  const button = { setAttribute() {}, classList: { toggle() {} }, addEventListener() {} };
  let requests = 0, exits = 0, fallback = false;
  const root = { classList: { add() { fallback = true; }, remove() { fallback = false; } }, requestFullscreen() { requests++; document.fullscreenElement = root; return Promise.resolve(); } };
  const document = { getElementById: id => id === 'fs-btn' ? button : root, addEventListener() {}, exitFullscreen() { exits++; document.fullscreenElement = null; return Promise.resolve(); } };
  const window = { addEventListener() {}, setTimeout() {} };
  vm.runInNewContext(script, { BROWSER_CONTROLS, navigator: { keyboard }, document, window, requestAnimationFrame() {}, console: { warn() {} } });
  assert.equal(await window.__toggleGameFullscreen(), true);
  assert.equal(requests, 1);
  assert.equal(document.fullscreenElement, root);
  assert.equal(fallback, false);
  assert.equal(exits, 0);
  assert.equal(await window.__toggleGameFullscreen(), false);
  assert.equal(exits, 1);
}
await fullscreenCase(undefined);
await fullscreenCase({ lock: () => Promise.reject(new Error('permission denied')), unlock() {} });
await fullscreenCase({ lock: () => Promise.resolve(), unlock() {} });

// Run the real constructor with visual collaborators stubbed; check lifecycle,
// rebinds and modifier handling without starting asset-heavy rendering.
const source = fs.readFileSync('world/playScene/PlayerInputHandler.js', 'utf8').replace(/^import[\s\S]*?;\r?\n/gm, '').replace('export class', 'class');
const listeners = new Map();
const scene = { gameState: 'playing', input: { keyboard: { on: (name, fn) => listeners.set(name, fn), off: (name, fn) => { assert.equal(listeners.get(name), fn); listeners.delete(name); } } } };
const context = { MouseDigInputController: class { destroy() {} } };
vm.createContext(context);
vm.runInContext(source + '\nthis.Handler = PlayerInputHandler;', context);
const Handler = context.Handler;
Handler.prototype._registerKeys = () => ({ run: { keyCode: 17, isDown: true }, right: { keyCode: 68 }, left: { keyCode: 65 }, down: { keyCode: 83 } });
Handler.prototype._createAimBox = () => {};
const handler = new Handler(scene);
function press(overrides = {}) {
  let prevented = false;
  listeners.get('keydown')({ ctrlKey: true, keyCode: 68, preventDefault() { prevented = true; }, ...overrides });
  return prevented;
}
assert.equal(press(), true, 'Ctrl+D must cancel bookmarking');
assert.equal(press({ keyCode: 83 }), true, 'Ctrl+S must cancel save page');
assert.equal(press({ ctrlKey: false }), false);
assert.equal(press({ altKey: true }), false);
assert.equal(press({ metaKey: true }), false);
assert.equal(press({ keyCode: 76 }), false, 'unbound shortcuts stay browser-owned');
scene._settingsKeyCaptureActive = true;
assert.equal(press(), false);
scene._settingsKeyCaptureActive = false;
scene.gameState = 'paused';
assert.equal(press(), false);
scene.gameState = 'playing';
handler.keys.run.isDown = false;
assert.equal(press(), false);
handler.keys.run.isDown = true;
handler.keys.right.keyCode = 69;
assert.equal(press(), false, 'old binding must not stay captured');
assert.equal(press({ keyCode: 69 }), true);
handler.destroy();
assert.equal(listeners.size, 0);
console.log('BROWSER_CONTROLS_REGRESSION_OK: native fullscreen without lock, denied lock, Ctrl shortcuts, rebinds, teardown');

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { MerchantPromptView } from '../systems/visual/MerchantPromptView.js';
import { MERCHANT_SIGN_ART as ART } from '../values/merchantSignArt.js';
import { GAMEPLAY_PRESENTATION } from '../values/gameplayPresentation.js';
import { USER_SETTINGS } from '../systems/UserSettings.js';

const manifest = JSON.parse(readFileSync(new URL('../sprites/UI/merchant-signs-v1/manifest.json', import.meta.url)));
const sizes = new Map();
assert.equal(ART.enabled, true);
assert.deepEqual(Object.keys(ART.merchants).sort(), manifest.assets.map(a => a.id).sort());
for (const asset of manifest.assets) {
  const config = ART.merchants[asset.id];
  const path = new URL('../' + config.path, import.meta.url);
  const bytes = readFileSync(path);
  assert.equal(bytes[25], 6, asset.id + ' must be true RGBA');
  sizes.set(config.key, [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.runtime.sha256);
  const source = readFileSync(new URL('../sprites/UI/merchant-signs-v1/' + asset.sourceFile, import.meta.url));
  assert.equal(createHash('sha256').update(source).digest('hex'), asset.sha256, 'Generated source is unchanged');
  assert.equal(GAMEPLAY_PRESENTATION.merchant.actions[asset.id], asset.action, 'Baked copy matches normal gameplay action');
  assert.ok(existsSync(new URL('../sprites/UI/merchant-signs-v1/' + asset.runtime.masterFile, import.meta.url)));
}

class Events extends EventEmitter {
  bindings = new Map();
  on(event, callback, context) {
    const bound = context ? callback.bind(context) : callback;
    this.bindings.set(callback, bound);
    return super.on(event, bound);
  }
  off(event, callback) { return super.off(event, this.bindings.get(callback) || callback); }
}
function object(x = 0, y = 0, text = '', style = {}, key = '') {
  const native = sizes.get(key) || [171, 39];
  return {
    x, y, text, style, visible: true, width: text ? text.length * style.fontSize * .6 : native[0],
    height: native[1], scaleX: 1, scaleY: 1, children: [], texture: { key },
    setScrollFactor() { return this; }, setDepth() { return this; }, setOrigin() { return this; },
    setRotation() { return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setVisible(value) { this.visible = value; return this; },
    setText(value) { this.text = value; this.width = value.length * (style.fontSize || 12) * .6; return this; },
    add(children) { this.children.push(...children); return this; },
    destroy() { this.destroyed = true; },
  };
}
function scene(width = 1280, height = 720, artAvailable = true) {
  return {
    gameState: 'playing', events: new Events(), scale: { width, height },
    cameras: { main: { x: 0, y: 0, width, height, scrollX: 0, scrollY: 0, zoomX: 1, zoomY: 1, rotation: 0,
      matrix: { transformPoint: (x, y) => ({ x, y }), applyInverse: (x, y) => ({ x, y }) } } },
    textures: { exists: key => artAvailable && sizes.has(key) },
    add: { container: (x, y) => object(x, y),
      image: (x, y, key) => object(x, y, '', {}, key),
      text: (x, y, value, style) => object(x, y, value, style) },
  };
}
const savedKeyLabel = USER_SETTINGS.getKeyLabel;
try {
  USER_SETTINGS.getKeyLabel = () => 'F';
  for (const [id, asset] of Object.entries(ART.merchants)) {
    for (const [width, height] of [[1280, 720], [800, 450], [1920, 1080]]) {
      const s = scene(width, height);
      const view = new MerchantPromptView(s, id, id, -500, -500);
      view.update(true);
      assert.equal(view.frame.texture.key, asset.key);
      assert.equal(view.title, undefined, 'Baked titles never get a text overlay');
      assert.equal(view.detail, undefined, 'Baked actions never get a text overlay');
      assert.equal(view.keyLabel.text, 'F');
      assert.equal(view.root.visible, true);
      for (const [x, y] of [[-500, -500], [width + 500, height + 500]]) {
        view.worldX = x; view.worldY = y; view.update(true);
        const w = view.size.width * view.root.scaleX, h = view.size.height * view.root.scaleY;
        assert.ok(view.root.x - w / 2 >= 0 && view.root.x + w / 2 <= width);
        assert.ok(view.root.y - h / 2 >= 0 && view.root.y + h / 2 <= height);
      }
      view.update(true, 'RUSH BUYER • RUBY ×3 • 45s');
      assert.ok(view.rushFrame.visible && view.rushLabel.visible);
      const rushHeight = view.size.height;
      view.update(true, 'RUSH BUYER • RUBY ×3 • 44s');
      assert.ok(view.rushLabel.text.endsWith('44s'), 'Event countdown updates separately from baked copy');
      assert.equal(view.frame.texture.key, asset.key);
      view.update(true);
      assert.equal(view.rushFrame.visible, false);
      assert.ok(view.size.height < rushHeight);
      s.shopOverlay = { isVisible: true }; s.events.emit('prerender');
      assert.equal(view.root.visible, false);
      s.shopOverlay.isVisible = false; s.gameState = 'paused'; s.events.emit('prerender');
      assert.equal(view.root.visible, false);
      s.gameState = 'playing'; view.update(false);
      assert.equal(view.root.visible, false);
      view.destroy();
      assert.equal(s.events.listenerCount('prerender'), 0);
    }
  }
  const rebound = new MerchantPromptView(scene(), 'boboMerchant', "Bobo's Shop", 600, 300);
  USER_SETTINGS.getKeyLabel = () => 'Numpad Enter';
  rebound.update(true);
  assert.equal(rebound.keyLabel.text, 'Numpad Enter');
  assert.ok(rebound.keyLabel.width * rebound.keyLabel.scaleX <= ART.key.maxWidth - ART.key.padding);
  assert.ok(rebound.keyFrame.displayWidth <= ART.key.maxWidth);
  rebound.destroy();
  const fallback = new MerchantPromptView(scene(1280, 720, false), 'boboMerchant', "Bobo's Shop", 600, 300);
  fallback.update(true);
  assert.equal(fallback.title.text, "BOBO'S SHOP");
  assert.ok(fallback.detail.text.includes('Browse abilities'));
  fallback.destroy();
} finally {
  USER_SETTINGS.getKeyLabel = savedKeyLabel;
}
console.log('MERCHANT_SIGNS_OK: 6 RGBA assets, unchanged sources, baked-only titles/actions, rebind, event countdown, viewport bounds, modal hiding, fallback and cleanup');

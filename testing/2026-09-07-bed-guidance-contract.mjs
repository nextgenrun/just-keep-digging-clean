import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { TownRestGuidanceSystem } from '../systems/onboarding/TownRestGuidanceSystem.js';
import { acquireUiInputPriority } from '../systems/UiInputPriorityRegistry.js';
import { TOWN_REST } from '../values/townRest.js';

const scene = { events: new EventEmitter(), gameState: 'playing',
  sceneModeController: { isGameplayActive: true }, config: { tileSize: 94 },
  playerController: { physicsBody: { x: 0, y: 0, w: 30, h: 75 } } };
const body = scene.playerController.physicsBody;
const view = { arrow: { visible: false }, create: () => true,
  present(data) { this.data = data; this.arrow.visible = data.showArrow; },
  hide() { this.arrow.visible = false; }, destroy() { this.destroyed = true; } };
let arrived = false, resting = false;
const guide = new TownRestGuidanceSystem(scene, view, {
  target: () => ({ x: 1800, y: 0, feetY: 75 }),
  arrived: () => arrived, resting: () => resting,
});
function advance(ms) { while (ms > 0) { const dt = Math.min(50, ms); guide.update(dt); ms -= dt; } }
assert.equal(guide.request(), true);
advance(7800);
assert.equal(guide.phase, 'invited');
for (let i = 0; i < 4; i++) { body.x += 1; advance(25); body.x -= 1; advance(25); }
assert.equal(guide.phase, 'fading', 'tiny animation or movement jitter cannot latch the arrow');
advance(300); assert.ok(guide.alpha > 0 && guide.alpha < 1);
advance(400); assert.equal(guide.phase, 'idle'); assert.equal(view.arrow.visible, false);

guide.request(); advance(1000);
body.x += 80; advance(50);
assert.equal(guide.phase, 'following');
advance(20000); assert.equal(guide.phase, 'following'); assert.equal(view.arrow.visible, true);
body.x -= 200; advance(10000);
assert.equal(guide.phase, 'following', 'a detour after following does not discard the destination');
const elapsed = guide.elapsed;
scene.gameState = 'paused'; advance(20000);
assert.equal(guide.elapsed, elapsed); assert.equal(view.arrow.visible, false);
scene.gameState = 'playing';
const release = acquireUiInputPriority(scene);
advance(20000); assert.equal(guide.elapsed, elapsed);
release(); advance(50); assert.equal(view.arrow.visible, true);
arrived = true; advance(50); assert.equal(view.arrow.visible, false); assert.equal(guide.phase, 'idle');

guide.request(); assert.equal(guide.phase, 'arrived'); assert.equal(view.arrow.visible, false);
assert.equal(view.data.hintAlpha, 1); advance(7000); assert.equal(guide.phase, 'idle');
arrived = false; body.x = 1785; body.y = 4000;
guide.request(); body.y -= 100; advance(50);
assert.equal(guide.phase, 'following', 'ascending underground counts as approach');
assert.equal(view.arrow.visible, true, 'matching bed X underground is not arrival');
resting = true; advance(50); assert.equal(guide.phase, 'idle');
resting = false; body.x = 0; body.y = 0;
guide.request(); advance(8150); assert.equal(guide.phase, 'fading');
body.x += 100; advance(50); assert.equal(guide.phase, 'following'); assert.equal(guide.alpha, 1);
guide.request(); advance(9000); assert.equal(guide.phase, 'following', 'repeat Save retains accepted guidance');
assert.equal(scene.events.listenerCount('postupdate'), 1);
guide.destroy();
assert.equal(guide.phase, 'destroyed'); assert.equal(scene.events.listenerCount('postupdate'), 0);
assert.equal(view.destroyed, true); assert.equal(guide.request(), false);
assert.equal(TOWN_REST.guidance.ignoreMs, 8000);
console.log('BED_GUIDANCE_CONTRACT_OK: ignore/fade, jitter, follow/detour, paused UI, arrival, vertical approach, fade rescue, repeat request, cleanup');

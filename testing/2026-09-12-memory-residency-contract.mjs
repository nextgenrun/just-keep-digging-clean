import assert from 'node:assert/strict';
import { CELESTIAL_TALENT_TREE_EAGER_ASSETS as eager, CELESTIAL_TALENT_TREE_PRELOAD_ASSETS as all } from '../values/celestialTalentTreeUi.js';
import { RuntimeFeatureAssetManager } from '../world/rendering/RuntimeFeatureAssetManager.js';
import { RUNTIME_ASSET_LOADING } from '../values/runtimeAssetLoading.js';
import { resolvePlayerDeferredAssetPackId, resolvePlayerDeferredAssetPackReleaseDelayMs } from '../values/playerDeferredAssetPacks.js';

const eagerKeys = new Set(eager.map(a => a.key));
const lazy = all.filter(a => !eagerKeys.has(a.key));
assert.ok(eager.length > 0 && lazy.length > 0);
const keys = new Set(eagerKeys), managed = new Set(), requests = [], timers = new Set();
const textures = { exists: key => keys.has(key), remove: key => keys.delete(key) };
const coordinator = {
  enabled: true,
  textureMemory: {
    touch() {}, isManaged: key => managed.has(key),
    sample: () => ({ overBudget: true, estimatedBytes: 1000, lowWatermarkBytes: 640 }),
  },
  request(asset, options) {
    const request = { asset, options, cancelled: false };
    requests.push(request);
    return { cancel() { request.cancelled = true; return true; } };
  },
  releaseDecodedSource(key) { managed.delete(key); },
};
const manager = new RuntimeFeatureAssetManager({ textures, runtimeAssetLoadCoordinator: coordinator }, RUNTIME_ASSET_LOADING, '', {
  now: () => 1, setTimer(callback) { timers.add(callback); return callback; }, clearTimer(callback) { timers.delete(callback); },
});
for (let cycle = 0; cycle < 2; cycle++) {
  requests.length = 0;
  const ready = manager.ensureGroup('starlight', { consumer: 'memory-contract' });
  assert.equal(requests.length, lazy.length, 'requested UI must load above the memory watermark');
  for (const { asset, options } of requests) {
    assert.ok(!eagerKeys.has(asset.key), 'shared HUD assets must not become owned by the screen');
    keys.add(asset.key); managed.add(asset.key); options.onReady();
  }
  await ready;
  assert.ok(all.every(a => keys.has(a.key)));
  manager.releaseGroup('starlight', 'memory-contract');
  for (const callback of [...timers]) { timers.delete(callback); callback(); }
  assert.ok(eager.every(a => keys.has(a.key)), 'closing must preserve shared HUD and Codex art');
  assert.ok(lazy.every(a => !keys.has(a.key)), 'closing must release screen-only textures');
}
requests.length = 0;
const cancelled = manager.ensureGroup('starlight', { consumer: 'cancel-contract' });
keys.add(requests[0].asset.key); managed.add(requests[0].asset.key); requests[0].options.onReady();
manager.releaseGroup('starlight', 'cancel-contract');
assert.equal((await cancelled).cancelled, true);
assert.ok(lazy.every(a => !keys.has(a.key)));
assert.ok(eager.every(a => keys.has(a.key)));
manager.destroy();
assert.equal(resolvePlayerDeferredAssetPackId('mixamoIdleFidgetSheet'), 'idle-fidget');
assert.equal(resolvePlayerDeferredAssetPackReleaseDelayMs('idle-fidget', 0), 60000);
assert.equal(resolvePlayerDeferredAssetPackId('idleSheet'), null);
console.log(`memory residency: ${eager.length} shared assets preserved; ${lazy.length} screen assets load, release, reopen and cancel under pressure`);

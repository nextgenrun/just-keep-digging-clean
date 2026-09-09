import assert from 'node:assert/strict';
const root = process.env.UNDERSTAR_REPO_URL || new URL('../', import.meta.url);
const load = file => import(new URL(file, root));
const { HardcoreModeSystem } = await load('systems/hardcore/HardcoreModeSystem.js');
const { HardcoreMemorialStore } = await load('systems/hardcore/HardcoreMemorialStore.js');
const { SceneModeController } = await load('systems/runtime/SceneModeController.js');
const { HARDCORE_MODE_CONFIG, isHardcoreModeExhausted } = await load('values/hardcoreMode.js');
const { HARDCORE_MEMORIAL_CONFIG } = await load('values/hardcoreMemorials.js');
const { SCENE_BASE_PHASES } = await load('values/sceneRuntime.js');
const { DugTilesSaveStore } = await load('world/model/DugTilesSaveStore.js');
const { beginHardcorePermanentDeath } = await load('world/playScene/HardcoreDeathBridge.js');
const { createPlaySceneSaveCoordinator } = await load('world/playScene/PlaySceneSaveRuntime.js');
const { HardcoreModalOverlay } = await load('ui/overlays/HardcoreModalOverlay.js');
const { HardcoreDeathRecapView } = await load('ui/overlays/HardcoreDeathRecapView.js');

function node() {
  return {
    visible: false, alpha: 1, text: '',
    setVisible(value) { this.visible = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setText(value) { this.text = value; return this; },
    setColor() { return this; }, setPosition() { return this; },
  };
}
function modalFor(scene) {
  const view = Object.create(HardcoreDeathRecapView.prototype);
  Object.assign(view, { scene, config: HARDCORE_MEMORIAL_CONFIG, mode: null,
    pages: [], pageIndex: 0, ready: false, root: node() });
  for (const key of ['title', 'subtitle', 'reason', 'pageTitle', 'pageBody',
    'pageIndicator', 'status', 'detail', 'footer', 'retryButton', 'menuButton']) view[key] = node();
  view.retryButton.actionLabel = node(); view.menuButton.actionLabel = node();
  view.buttons = [{ root: view.retryButton }, { root: view.menuButton }];
  const modal = Object.create(HardcoreModalOverlay.prototype);
  Object.assign(modal, { scene, config: HARDCORE_MODE_CONFIG, root: node(),
    panel: node(), confirmationRoot: node(), instruction: node(), footer: node(),
    deathView: view, _keyHandler() {}, mode: null });
  return modal;
}
function fixture(failures = 0, mode = 'hardcore') {
  const data = new Map();
  let attempts = 0;
  const storage = {
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { return data.get(key) ?? null; },
    removeItem(key) { data.delete(key); },
    setItem(key, value) {
      if (key === 'dig-game-save-slot-3' && ++attempts <= failures) throw new Error('simulated disk full');
      data.set(key, String(value));
    },
  };
  globalThis.window = { localStorage: storage };
  globalThis.localStorage = storage;
  const system = new HardcoreModeSystem({ mode, armed: true });
  const controller = new SceneModeController({ basePhase: SCENE_BASE_PHASES.ACTIVE });
  const routes = [], authorityFailures = [];
  const scene = {
    config: { topAirRows: 65, tileSize: 94 }, saveSlot: 3,
    worldIdentity: 'hardcore-death-bed-regression', playerCharacterId: 'default',
    townRestSystem: {}, _townRestCommit: false, _saveWritesBlocked: false,
    hardcoreModeData: system.getSaveData(),
    _hardcoreRuntime: { system, config: HARDCORE_MODE_CONFIG, updateDiagnostics() {} },
    sceneModeController: controller,
    setSceneBasePhase: (phase, context) => controller.setBasePhase(phase, context),
    scene: { isActive: () => false, start: key => routes.push(key) },
    input: { keyboard: { on() {}, off() {} } }, tweens: { add() {} },
    time: { delayedCall(_delay, callback) { callback(); } },
    hidePauseMenu() {}, lightSystem: { forceTorchOff() {} },
    player: { anims: { stop() {} } }, aimBox: node(),
    playerController: {
      physicsBody: { x: 940, y: 18000, w: 60, h: 80 },
      getPlayerTile: () => ({ tx: 10, ty: 191 }), getGemPowerMax: () => 110,
      getPersistenceData: () => ({ bodyX: 940, bodyY: 18000, gemPower: 0, facingRight: true }),
      setControlsEnabled() {},
    },
    worldModel: {
      getWorldIdentity: () => ({ seed: 101, width: 320, depth: 2400, topAirRows: 65 }),
      getDugTileKeys: () => ['10,190'], getRubbleTiles: () => [],
    },
    digSystem: { getResourceTotals: () => ({ dirt: 12 }) },
    upgradeSystem: { getMoney: () => 20, toJSON: () => ({ money: 20 }) },
    dugTileSaveStore: new DugTilesSaveStore({ slotId: 3 }),
    hardcoreMemorialStore: new HardcoreMemorialStore({ storage }),
    _handleAuthorityFailure(finding) { authorityFailures.push(finding); scene._saveWritesBlocked = true; },
  };
  const modal = modalFor(scene);
  scene._hardcoreRuntime.modal = modal;
  scene.gameSaveCoordinator = createPlaySceneSaveCoordinator(scene);
  return { scene, modal, system, routes, storage, data, authorityFailures, attempts: () => attempts };
}

const { HardcoreMemorialWorldSystem } = await load('systems/visual/HardcoreMemorialWorldSystem.js');
// Phaser destroys display-list objects before the owning system's shutdown hook.
const grave = Object.create(HardcoreMemorialWorldSystem.prototype);
let rootsDestroyed = 0, liveInputDisabled = 0;
Object.assign(grave, { scene: {}, records: [{ id: 'previous-run' }], entries: [{
  image: { scene: undefined, removeAllListeners() {},
    disableInteractive() { throw new Error('destroyed grave image has no scene sys'); } },
  pulse: { stop() {} }, root: { destroy() { rootsDestroyed++; } },
}] });
assert.doesNotThrow(() => grave.destroy(), 'A destroyed grave cannot interrupt scene cleanup');
assert.deepEqual(grave.entries, []);
assert.deepEqual(grave.records, []);
assert.equal(grave.scene, null);
assert.equal(rootsDestroyed, 1);
assert.doesNotThrow(() => grave.destroy());
grave.entries = [{ image: { scene: { sys: {} }, removeAllListeners() {},
  disableInteractive() { liveInputDisabled++; } }, root: { destroy() {} } }];
grave._clearEntries();
assert.equal(liveInputDisabled, 1, 'Live grave input is still released');

const errors = [];
const savedConsole = { error: console.error, warn: console.warn };
console.error = (...args) => errors.push(args);
console.warn = (...args) => errors.push(args);
try {
  // The actual production coordinator must retain bed-only playable checkpoints.
  const first = fixture();
  first.scene.gameSaveCoordinator.requestSnapshot('mining');
  assert.equal(await first.scene.gameSaveCoordinator.flush({ force: true, reason: 'page-hide' }), false);
  assert.equal(first.data.size, 0);
  assert.equal(await beginHardcorePermanentDeath(first.scene, { source: 'stress' }), true,
    'Hardcore death before the first bed save must persist through the production gate');
  assert.equal(first.attempts(), 1);
  assert.equal(first.modal.mode, 'death');
  assert.equal(first.modal.deathView.menuButton.visible, true);
  assert.equal(first.scene._hardcoreLifeStateSaveInProgress, false);
  assert.equal(first.scene.gameSaveCoordinator.requestSnapshot('ordinary-save-after-death'), false);
  assert.equal(await beginHardcorePermanentDeath(first.scene, { source: 'stress' }), false);
  const reloaded = new DugTilesSaveStore({ slotId: 3 }).loadForDisplay();
  assert.equal(isHardcoreModeExhausted(reloaded.hardcoreModeData), true);
  assert.equal(reloaded.hardcoreModeData.deaths, 1);
  assert.equal(reloaded.hardcoreModeData.livesRemaining, 0);
  assert.equal(first.scene.dugTileSaveStore.isDeathTombstoned(), false);
  assert.equal(first.scene.hardcoreMemorialStore.getForSlot(3).length, 1);
  await first.modal.deathView.onRetry();
  assert.deepEqual(first.routes, ['StartMenuScene']);
  assert.equal(first.modal.root.visible, false);
  first.scene.gameSaveCoordinator.destroy();

  // Real storage fails twice; real view, overlay, bridge, coordinator and store recover.
  const retry = fixture(2);
  assert.equal(await beginHardcorePermanentDeath(retry.scene, { source: 'signal-explosion' }), false);
  assert.equal(retry.modal.root.visible, true);
  assert.equal(retry.modal.deathView.retryButton.visible, true);
  assert.equal(retry.modal.deathView.menuButton.visible, false);
  assert.equal(retry.modal.deathView.handleKey({ key: 'Escape' }), false,
    'A hidden Main Menu action cannot be activated by Escape after a failed death save');
  assert.equal(retry.modal.deathView.ready, true);
  assert.deepEqual(retry.routes, []);
  assert.equal(retry.scene._saveWritesBlocked, false, 'Recoverable death writes cannot poison retry authority');

  const pending = retry.modal.deathView.onRetry();
  assert.equal(retry.modal.root.visible, true, 'The recap stays visible throughout an async retry');
  assert.equal(retry.modal.mode, 'death');
  assert.equal(await pending, false);
  assert.equal(retry.modal.root.visible, true);
  assert.equal(retry.modal.deathView.retryButton.visible, true);
  assert.equal(retry.modal.deathView.ready, true);
  assert.equal(retry.attempts(), 2);
  assert.deepEqual(retry.routes, []);
  assert.equal(retry.modal.deathView.handleKey({ key: 'Enter' }), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(retry.routes, ['StartMenuScene']);
  assert.equal(retry.attempts(), 3);
  assert.equal(retry.modal.root.visible, false);
  assert.equal(retry.system.getSaveData().deaths, 1, 'Retries cannot consume another life');
  assert.equal(retry.scene.hardcoreMemorialStore.getForSlot(3).length, 1);
  assert.equal(retry.authorityFailures.length, 0);
  assert.equal(retry.scene.dugTileSaveStore.loadForDisplay().hardcoreModeData.exhausted, true);
  retry.scene.gameSaveCoordinator.destroy();

  // Casual runs and true authority failures never gain the death-save exception.
  const casual = fixture(0, 'casual');
  casual.scene._hardcoreDeathInProgress = true;
  casual.scene._hardcoreLifeStateSaveInProgress = true;
  assert.equal(await casual.scene.gameSaveCoordinator.flush({ force: true }), false);
  assert.equal(casual.data.size, 0);
  casual.scene.gameSaveCoordinator.destroy();
  const blocked = fixture();
  blocked.scene._saveWritesBlocked = true;
  assert.equal(await beginHardcorePermanentDeath(blocked.scene, { source: 'stress' }), false);
  assert.equal(blocked.attempts(), 0);
  assert.equal(blocked.scene._saveWritesBlocked, true);
  blocked.scene.gameSaveCoordinator.destroy();

  const invalid = fixture();
  invalid.scene.playerController.getPersistenceData = () => ({ bodyX: NaN, bodyY: 0, gemPower: 0 });
  assert.equal(await beginHardcorePermanentDeath(invalid.scene, { source: 'stress' }), false);
  assert.equal(invalid.authorityFailures[0].id, 'game-save-validation');
  assert.equal(invalid.scene._saveWritesBlocked, true);
  assert.equal(invalid.attempts(), 0);
  invalid.scene.gameSaveCoordinator.destroy();
} finally {
  Object.assign(console, savedConsole);
  delete globalThis.window;
  delete globalThis.localStorage;
}
console.log('HARDCORE_DEATH_BED_RETRY_OK: durable exhaustion, bed-only checkpoints, repeated failure recovery, keyboard exits, duplicate death, authority guards');


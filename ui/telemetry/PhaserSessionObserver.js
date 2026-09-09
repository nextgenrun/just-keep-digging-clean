import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
import { KEYBIND_ACTIONS } from '../../values/keybindActions.js';
import { USER_SETTINGS, normalizeKeyboardEvent } from '../../systems/UserSettings.js';
// Observation preserves each original return value, promise identity, and exception.
export class PhaserSessionObserver {
  constructor(service, game) {
    this.service = service; this.game = game; this.scenes = new WeakSet(); this.objects = new WeakMap();
    this.disposers = []; this.lastStateAt = 0; this.lastState = {}; this.lastUi = ''; this.rejections = new Map();
    service.inputs.resolveAction = event => KEYBIND_ACTIONS.find(action =>
      USER_SETTINGS.getKey(action.id) === normalizeKeyboardEvent(event))?.id || null;
    const settings = new Map();
    const changedSettings = snapshot => {
      for (const group of ['audio', 'display']) for (const [key, value] of Object.entries(snapshot[group] || {})) {
        if (typeof value !== 'boolean' && typeof value !== 'number') continue;
        const code = group + '.' + key;
        if (settings.has(code) && settings.get(code) !== value) service.record('settings_changed', { code, value });
        settings.set(code, value);
      }
    };
    changedSettings(USER_SETTINGS.getSettings());
    this.disposers.push(USER_SETTINGS.subscribe(changedSettings));
    const committed = detail => service.saveCommitted(detail);
    game.events.on('player-data-save-committed', committed);
    this.disposers.push(() => game.events.off('player-data-save-committed', committed));
    game.events.once('destroy', () => this.destroy());
    this.sample();
  }
  observe(object, name, type, fields) {
    if (!object || typeof object[name] !== 'function') return;
    let names = this.objects.get(object);
    if (!names) { names = new Set(); this.objects.set(object, names); }
    if (names.has(name)) return;
    names.add(name);
    const original = object[name], descriptor = Object.getOwnPropertyDescriptor(object, name), service = this.service;
    const record = (args, result) => { try { const detail = fields(args, result); if (detail) service.record(type, detail); } catch {} };
    const wrapper = function(...args) {
      const result = original.apply(this, args);
      if (result && typeof result.then === 'function') result.then(value => record(args, value)).catch(() => {});
      else record(args, result);
      return result;
    };
    object[name] = wrapper;
    this.disposers.push(() => {
      if (object[name] !== wrapper) return;
      if (descriptor) Object.defineProperty(object, name, descriptor); else delete object[name];
    });
  }
  attachScene(scene) {
    if (this.scenes.has(scene)) return;
    this.scenes.add(scene);
    const key = scene.sys.settings.key;
    for (const name of ['start', 'create', 'pause', 'resume', 'sleep', 'wake', 'shutdown']) {
      const listener = () => this.service.record('scene_' + name, { scene: key });
      scene.sys.events.on(name, listener);
      this.disposers.push(() => scene.sys.events.off(name, listener));
    }
    for (const name of ['start', 'complete', 'loaderror']) {
      const listener = file => this.service.record('load_' + name, {
        scene: key, file: typeof file?.key === 'string' ? file.key : undefined,
      });
      scene.load?.on(name, listener);
      this.disposers.push(() => scene.load?.off(name, listener));
    }
    const click = (_pointer, object) => this.service.record('ui_click', {
      scene: key, code: object?.getData?.('telemetryAction') || object?.type || 'control',
      x: object?.x, y: object?.y,
    });
    scene.input?.on('gameobjectdown', click);
    this.disposers.push(() => scene.input?.off('gameobjectdown', click));
  }
  sample() {
    for (const scene of this.game.scene.scenes) this.attachScene(scene);
    const active = this.game.scene.getScenes(true).filter(scene => scene.sys.settings.key !== 'MenuAudioScene');
    const scene = active.at(-1);
    if (!scene) return;
    const key = scene.sys.settings.key;
    const gameplay = key === 'PlayScene' || key === 'CaveScene';
    const phase = /Boot|WorldLoad/.test(key) ? 'loading' : !gameplay ? 'menu'
      : scene.sceneModeController ? scene.sceneModeController.isGameplayActive ? 'gameplay' : 'paused'
      : scene.paused || scene.isInShop || scene.isInDialogue ? 'paused' : 'gameplay';
    this.service.recorder.setState({ scene: key, phase });
    this.observe(scene.digSystem, '_notifyPlayerDig', 'dig_result', (args) => args[3]?.success ? ({
      tileX: args[0]?.tx, tileY: args[0]?.ty, success: true, destroyed: args[3].destroyed, damage: args[3].damage,
    }) : null);
    this.observe(scene.digSystem, 'tryMine', 'dig_blocked', (args, result) => {
      if (result?.success !== false) return null;
      const reason = result.reason || 'blocked';
      const key = reason + ':' + args[0]?.tx + ':' + args[0]?.ty;
      const prior = this.rejections.get(key);
      if (prior) { prior.count++; return null; }
      if (this.rejections.size >= C.maxMemoryEvents) { this.service.recorder.dropped++; return null; }
      this.rejections.set(key, { reason, count: 1 });
      return { reason, tileX: args[0]?.tx, tileY: args[0]?.ty };
    });
    for (const method of ['purchaseNode', 'upgradeNode'])
      this.observe(scene.celestialTalentProgressionSystem, method, 'talent_result', (args, result) => ({
        action: method, upgrade: args[0], success: result?.ok === true, reason: result?.reason, rank: result?.rank,
      }));
    this.observe(scene.upgradeSystem, 'purchaseUpgrade', 'upgrade_result', (args, result) => ({
      upgrade: args[0], success: result?.success === true, reason: result?.reason, rank: result?.level,
    }));
    this.observe(scene.playerController?.abilities, 'executeThunderStrike', 'ability_result', (_args, result) => ({
      action: 'thunderStrike', success: result?.success === true || result === true, reason: result?.reason,
    }));
    if (scene._hardcoreDeathInProgress && !this.lastState.dead)
      this.service.record('player_death', { reason: scene._hardcoreRuntime?.lastDeath?.source });
    this.observe(scene, 'returnToMainMenu', 'menu_return', () => ({}));
    const slot = scene.saveSlot ?? scene.selectedSlot;
    const ui = [scene._menuIndex, slot, !!scene._overlay, !!scene.isInShop, !!scene.isInDialogue,
      !!scene.inventoryUI?.isVisible, !!scene.worldMapUI?.isVisible, scene.gameState].join(':');
    if (ui !== this.lastUi) {
      this.service.record('ui_state', { index: scene._menuIndex, slot, phase: scene.gameState,
        shop: !!scene.isInShop, dialogue: !!scene.isInDialogue, inventory: !!scene.inventoryUI?.isVisible, map: !!scene.worldMapUI?.isVisible });
      this.lastUi = ui;
    }
    const pc = scene.playerController, body = pc?.physicsBody, abilities = pc?.abilities;
    const state = {
      x: body?.x, y: body?.y, gp: abilities?.gemPower, hp: pc?.state?.health,
      level: scene.playerLevelSystem?.level, xp: scene.playerLevelSystem?.xp,
      gold: scene.upgradeSystem?.money, depth: body && scene.config?.tileSize ? Math.max(0, Math.floor(body.y / scene.config.tileSize) - scene.config.topAirRows + 1) : undefined,
      flying: abilities?.isFlying?.(), running: abilities?.isRunning?.(), action: abilities?.isQuickslashActive?.() ? 'quickslash' : 'none',
      dead: !!scene._hardcoreDeathInProgress, slot, fps: this.game.loop?.actualFps, count: scene.digSystem?.tilesBroken,
    };
    for (const field of ['level', 'count', 'flying', 'running', 'action', 'gold']) {
      if (this.lastState[field] !== undefined && state[field] !== this.lastState[field])
        this.service.record('state_change', { code: field, from: this.lastState[field], to: state[field] });
    }
    this.lastState = state;
    const now = performance.now();
    if (now - this.lastStateAt >= C.stateIntervalMs) {
      this.lastStateAt = now; this.service.recorder.account();
      for (const rejection of this.rejections.values()) this.service.record('dig_blocked_count', rejection);
      this.rejections.clear();
      this.service.record('heartbeat', { state, totals: this.service.recorder.totals, dropped: this.service.outbox.lost });
    }
    if ([...this.service.recorder.held.keys()].some(action => action.startsWith('fly:')) && abilities?.gemPower <= 0 && !abilities?.isFlying?.()) {
      if (!this.flightBlocked) this.service.record('action_blocked', { action: 'fly', reason: 'insufficient_gp' });
      this.flightBlocked = true;
    } else this.flightBlocked = false;
  }
  destroy() { this.disposers.splice(0).reverse().forEach(dispose => { try { dispose(); } catch {} }); }
}

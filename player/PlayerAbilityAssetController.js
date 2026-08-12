import {
  PLAYER_ABILITY_ASSET_IDS,
  getPlayerAbilityAssetPack,
} from "./PlayerAssetLoader.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
} from "../values/runtimeAssetLoading.js";

const ABILITY_POLICY = Object.freeze({
  [PLAYER_ABILITY_ASSET_IDS.quickslash]: Object.freeze({
    owner: RUNTIME_ASSET_LOADING.owners.abilityQuickslash,
    isUnlocked: upgrades => upgrades?.isQuickslashUnlocked?.() === true,
    animations: profile => [[
      profile.quickslashAnim,
      profile.quickslashSheet,
      profile.quickslashFrames,
      profile.quickslashAnimationFps || 12,
      0,
    ]],
  }),
  [PLAYER_ABILITY_ASSET_IDS.thunderStrike]: Object.freeze({
    owner: RUNTIME_ASSET_LOADING.owners.abilityThunderStrike,
    isUnlocked: upgrades => upgrades?.isThunderStrikeUnlocked?.() === true,
    animations: profile => [
      [
        profile.thunderStrikeChargeAnim,
        profile.thunderStrikeChargeSheet,
        profile.thunderStrikeChargeFrames,
        profile.thunderStrikeChargeAnimationFps || 6,
        -1,
      ],
      [
        profile.thunderStrikeStrikeAnim,
        profile.thunderStrikeStrikeSheet,
        profile.thunderStrikeStrikeFrames,
        profile.thunderStrikeStrikeAnimationFps || 12,
        0,
      ],
    ],
  }),
});

function now(scene) {
  const sceneNow = Number(scene?.time?.now);
  return Number.isFinite(sceneNow)
    ? sceneNow
    : globalThis.performance?.now?.() || Date.now();
}

export class PlayerAbilityAssetController {
  constructor(scene, profile, config = RUNTIME_ASSET_LOADING) {
    this.scene = scene;
    this.profile = profile;
    this.config = config;
    this.coordinator = scene.runtimeAssetLoadCoordinator;
    this.states = new Map();
    this.destroyed = false;
  }

  isReady(abilityId) {
    const assets = getPlayerAbilityAssetPack(this.profile, abilityId);
    return assets.length === 0
      || assets.every(asset => this.scene?.textures?.exists?.(asset.key));
  }

  ensure(abilityId) {
    if (this.destroyed) return Promise.resolve({ ready: false, reason: "destroyed" });
    if (this.isReady(abilityId)) {
      this._createAnimations(abilityId);
      return Promise.resolve({ ready: true, abilityId });
    }
    const policy = ABILITY_POLICY[abilityId];
    if (!policy || !this.coordinator?.enabled) {
      return Promise.resolve({ ready: false, abilityId, reason: "unavailable" });
    }
    const previous = this.states.get(abilityId);
    if (["loading", "deferred"].includes(previous?.status)) return previous.promise;
    if (Number(previous?.retryAfterMs) > now(this.scene)) {
      return Promise.resolve({ ready: false, abilityId, reason: "retry-wait" });
    }

    const state = {
      abilityId,
      status: "idle",
      assets: getPlayerAbilityAssetPack(this.profile, abilityId),
      handles: new Set(),
      pending: 0,
      deferredAtMs: now(this.scene),
      retryAfterMs: 0,
      resolve: null,
      promise: null,
    };
    state.promise = new Promise(resolve => { state.resolve = resolve; });
    this.states.set(abilityId, state);
    if (this._overBudget()) state.status = "deferred";
    else this._start(state, policy);
    return state.promise;
  }

  update() {
    if (this.destroyed) return;
    for (const [abilityId, policy] of Object.entries(ABILITY_POLICY)) {
      if (policy.isUnlocked(this.scene?.upgradeSystem) && !this.isReady(abilityId)) {
        void this.ensure(abilityId);
      }
    }
    for (const state of this.states.values()) {
      if (state.status !== "deferred") continue;
      if (!this._overBudget()) {
        this._start(state, ABILITY_POLICY[state.abilityId]);
      } else if (
        now(this.scene) - state.deferredAtMs
        >= this.config.featureResidency.optionalLoadTimeoutMs
      ) {
        this._settle(state, false, "memory-timeout");
      }
    }
  }

  getSnapshot() {
    return Object.freeze({
      abilities: Object.fromEntries(Object.keys(ABILITY_POLICY).map(abilityId => [
        abilityId,
        Object.freeze({
          ready: this.isReady(abilityId),
          status: this.states.get(abilityId)?.status || "idle",
          assetCount: getPlayerAbilityAssetPack(this.profile, abilityId).length,
        }),
      ])),
    });
  }

  _overBudget() {
    return this.coordinator?.textureMemory?.sample?.(true)?.overBudget === true;
  }

  _start(state, policy) {
    state.status = "loading";
    state.pending = state.assets.length;
    for (const asset of state.assets) {
      const handle = this.coordinator.request(asset, {
        owner: policy.owner,
        priority: this.config.priorities.abilityUnlock,
        residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.unlock,
        packId: `ability:${state.abilityId}:${this.profile?.characterId || "unknown"}`,
        consumers: [state.abilityId],
        onReady: () => {
          if (state.status !== "loading") return;
          state.pending -= 1;
          if (state.pending === 0) {
            this._createAnimations(state.abilityId);
            this._settle(state, true);
          }
        },
        onError: () => this._settle(state, false, "load-failed"),
      });
      if (!handle) {
        this._settle(state, false, "queue-unavailable");
        return;
      }
      if (state.status === "loading") state.handles.add(handle);
    }
  }

  _createAnimations(abilityId) {
    const animations = ABILITY_POLICY[abilityId]?.animations(this.profile) || [];
    for (const [key, sheet, frames, frameRate, repeat] of animations) {
      if (!key || !sheet || !frames?.length || this.scene.anims?.exists?.(key)) continue;
      if (!this.scene.textures?.exists?.(sheet)) continue;
      this.scene.anims.create({
        key,
        frames: frames.map(frame => ({ key: sheet, frame })),
        frameRate,
        repeat,
      });
    }
  }

  _settle(state, ready, reason = null) {
    if (!["loading", "deferred"].includes(state.status)) return;
    if (!ready) {
      for (const handle of state.handles) handle.cancel?.();
      state.retryAfterMs = now(this.scene) + 1000;
    }
    state.handles.clear();
    state.pending = 0;
    state.status = ready ? "ready" : "idle";
    const resolve = state.resolve;
    state.resolve = null;
    state.promise = null;
    resolve?.({ ready, abilityId: state.abilityId, reason });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const state of this.states.values()) {
      if (["loading", "deferred"].includes(state.status)) {
        this._settle(state, false, "destroyed");
      }
    }
    this.states.clear();
    this.scene = null;
    this.coordinator = null;
  }
}

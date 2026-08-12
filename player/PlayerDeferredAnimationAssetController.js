import { getPlayerDeferredAssetPack } from "./PlayerAssetLoader.js";
import { createUalNativePlayerAnimations } from "./UalNativePlayerAnimations.js";
import { PLAYER_DEFERRED_ASSET_PACK_IDS } from
  "../values/playerDeferredAssetPacks.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
} from "../values/runtimeAssetLoading.js";

function now(scene) {
  const sceneNow = Number(scene?.time?.now);
  return Number.isFinite(sceneNow)
    ? sceneNow
    : globalThis.performance?.now?.() || Date.now();
}

function animationKeysByPack(profile) {
  const result = new Map(Object.values(PLAYER_DEFERRED_ASSET_PACK_IDS)
    .map(packId => [packId, new Set()]));
  const add = (key, sheet) => {
    if (!key || !sheet) return;
    const packId = Object.values(PLAYER_DEFERRED_ASSET_PACK_IDS)
      .find(id => getPlayerDeferredAssetPack(profile, id)
        .some(asset => asset.key === sheet));
    if (packId) result.get(packId)?.add(key);
  };
  [
    [PLAYER_DEFERRED_ASSET_PACK_IDS.crouch, [profile.duckAnim]],
    [PLAYER_DEFERRED_ASSET_PACK_IDS.flight, [
      profile.flyAnim, profile.flightEnterAnim, profile.flightTravelEnterAnim,
      profile.flightTravelLoopAnim, profile.flightHoverAnim, profile.flightExitAnim,
    ]],
    [PLAYER_DEFERRED_ASSET_PACK_IDS.teleport, [profile.teleportInAnim]],
    [PLAYER_DEFERRED_ASSET_PACK_IDS.upwardAim, [
      profile.digUpLookAnim, profile.thunderStrikeChargeAnim,
    ]],
    [PLAYER_DEFERRED_ASSET_PACK_IDS.impact, [profile.earthquakeReactAnim]],
    [PLAYER_DEFERRED_ASSET_PACK_IDS.death, [profile.deathAnim]],
  ].forEach(([id, keys]) => keys.filter(Boolean)
    .forEach(key => result.get(id)?.add(key)));
  const specs = [
    ...(profile.animationPolishAnimations || []),
    ...(profile.digAnimationVariants || []),
    ...(profile.idleFidgets || []),
  ];
  for (const spec of specs) add(spec.key || spec.animationKey, spec.sheet);
  add(profile.landingAnim, profile.landingSheet);
  add(profile.softLandingAnim, profile.landingSheet);
  add(profile.wallPushAnim, profile.wallPushSheet);
  return new Map([...result].map(([id, keys]) => [id, [...keys]]));
}

export class PlayerDeferredAnimationAssetController {
  constructor(scene, profile, config = RUNTIME_ASSET_LOADING) {
    this.scene = scene;
    this.profile = profile;
    this.config = config;
    this.coordinator = scene.runtimeAssetLoadCoordinator;
    this.keysByPack = animationKeysByPack(profile);
    this.states = new Map();
    this.evictions = 0;
    this.destroyed = false;
  }

  ensureForAnimation(animationKey) {
    const packId = this._packForAnimation(animationKey);
    const state = packId ? this.states.get(packId) : null;
    if (state) state.lastUsedAtMs = now(this.scene);
    return packId
      ? this.ensure(packId)
      : Promise.resolve({ ready: false, reason: "not-deferred" });
  }

  isReadyOrRequest(animationKey) {
    if (!animationKey) return false;
    if (this.scene.anims?.exists?.(animationKey)) return true;
    void this.ensureForAnimation(animationKey);
    return false;
  }

  resolveOrRequest(animationKey, fallbackAnimationKey) {
    return this.isReadyOrRequest(animationKey)
      ? animationKey
      : fallbackAnimationKey;
  }

  ensure(packId) {
    if (this.destroyed) return Promise.resolve({ ready: false, reason: "destroyed" });
    const assets = getPlayerDeferredAssetPack(this.profile, packId);
    if (assets.length === 0) return Promise.resolve({ ready: true, packId });
    if (assets.every(asset => this.scene.textures?.exists?.(asset.key))) {
      const state = this.states.get(packId) || { status: "ready" };
      state.status = "ready";
      state.lastUsedAtMs = now(this.scene);
      this.states.set(packId, state);
      createUalNativePlayerAnimations(this.scene, this.profile);
      return Promise.resolve({ ready: true, packId });
    }
    const previous = this.states.get(packId);
    if (previous?.status === "loading") return previous.promise;
    if (!this.coordinator?.enabled) {
      return Promise.resolve({ ready: false, packId, reason: "unavailable" });
    }

    const state = {
      status: "loading", handles: new Set(), pending: assets.length,
      resolve: null, promise: null, lastUsedAtMs: now(this.scene),
    };
    state.promise = new Promise(resolve => { state.resolve = resolve; });
    this.states.set(packId, state);
    for (const asset of assets) {
      const handle = this.coordinator.request(asset, {
        owner: this.config.owners.playerMode,
        priority: this.config.priorities.playerMode,
        residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.onDemand,
        packId: `player-action:${packId}:${this.profile?.characterId || "unknown"}`,
        consumers: [`player-animation:${packId}`],
        onReady: () => {
          if (state.status !== "loading") return;
          state.pending -= 1;
          if (state.pending === 0) this._settle(packId, state, true);
        },
        onError: () => this._settle(packId, state, false, "load-failed"),
      });
      if (!handle) {
        this._settle(packId, state, false, "queue-unavailable");
        break;
      }
      if (state.status === "loading") state.handles.add(handle);
    }
    return state.promise;
  }

  _packForAnimation(animationKey) {
    for (const [packId, keys] of this.keysByPack) {
      if (keys.includes(animationKey)) return packId;
    }
    return null;
  }

  update() {
    if (this.destroyed) return;
    const playingKey = this.scene.player?.anims?.isPlaying
      ? this.scene.player.anims.currentAnim?.key
      : null;
    const sampledAtMs = now(this.scene);
    for (const [packId, state] of this.states) {
      if (state.status !== "ready") continue;
      if (playingKey && this.keysByPack.get(packId)?.includes(playingKey)) {
        state.lastUsedAtMs = sampledAtMs;
        continue;
      }
      if (
        sampledAtMs - Number(state.lastUsedAtMs || 0)
        < this.config.featureResidency.releaseDelayMs
      ) continue;
      this._evict(packId, state, sampledAtMs);
    }
  }

  _evict(packId, state, sampledAtMs) {
    for (const animationKey of this.keysByPack.get(packId) || []) {
      if (this.scene.anims?.exists?.(animationKey)) {
        this.scene.anims.remove?.(animationKey);
      }
    }
    for (const asset of getPlayerDeferredAssetPack(this.profile, packId)) {
      if (this.coordinator?.textureMemory?.isManaged?.(asset.key) === false) continue;
      if (this.scene.textures?.exists?.(asset.key)) this.scene.textures.remove(asset.key);
      this.coordinator?.releaseDecodedSource?.(asset.key);
    }
    state.status = "idle";
    state.lastUsedAtMs = sampledAtMs;
    this.evictions += 1;
  }

  _settle(packId, state, ready, reason = null) {
    if (state.status !== "loading") return;
    if (!ready) for (const handle of state.handles) handle.cancel?.();
    state.handles.clear();
    state.status = ready ? "ready" : "idle";
    state.lastUsedAtMs = now(this.scene);
    if (ready) createUalNativePlayerAnimations(this.scene, this.profile);
    const resolve = state.resolve;
    state.resolve = null;
    state.promise = null;
    resolve?.({ ready, packId, reason });
  }

  getSnapshot() {
    return Object.freeze({
      evictions: this.evictions,
      packs: Object.fromEntries([...this.keysByPack.keys()].map(packId => [
        packId,
        Object.freeze({
          status: this.states.get(packId)?.status || "idle",
          ready: getPlayerDeferredAssetPack(this.profile, packId)
            .every(asset => this.scene?.textures?.exists?.(asset.key)),
        }),
      ])),
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const [packId, state] of this.states) {
      if (state.status === "loading") this._settle(packId, state, false, "destroyed");
    }
    this.states.clear();
    this.scene = null;
    this.coordinator = null;
  }
}

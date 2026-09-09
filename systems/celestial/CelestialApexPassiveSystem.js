import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CELESTIAL_ENGINE_IDS } from "../../values/celestialEngines.js";
import { resolveCelestialTalentEngineDefinition } from "../../values/celestialTalentEffects.js";
import { CelestialActivationBudget } from "./CelestialActivationBudget.js";
import { HollowSunCompanion } from "./HollowSunCompanion.js";
import { StellarRageEngine } from "./StellarRageEngine.js?rev=20260904-apex-passives-v1";
import { WaywardStarCompanion } from "./WaywardStarCompanion.js";

const APEX_NODE_IDS = Object.freeze([
  "wayward-homebound-apex",
  "hollow-eternal-eclipse",
  "comet-echo-arsenal",
]);

/** Keeps the three rankable, no-activation apex echoes alive in PlayScene. */
export class CelestialApexPassiveSystem {
  constructor(scene, talentProgression, options = {}) {
    this.scene = scene;
    this.talentProgression = talentProgression;
    this.onImpact = options.onImpact;
    this.getAnchor = options.getAnchor;
    this.probeTile = options.probeTile;
    this.toTile = options.toTile;
    this.tileSize = Number(options.tileSize) || this.scene.config.tileSize;
    this.signature = "";
    this.serial = 0;
    this.wayward = null;
    this.hollow = null;
    this.lance = null;
  }

  update(nowMs, deltaMs) {
    this._sync(nowMs);
    this.wayward?.update(nowMs, deltaMs);
    this.hollow?.update(nowMs, deltaMs);
    this.lance?.update(nowMs, deltaMs);
  }

  _sync(nowMs) {
    const snapshot = this.talentProgression?.getSnapshot?.();
    const signature = APEX_NODE_IDS.map(id => snapshot?.nodeRanks?.[id] || 0).join(":");
    if (signature === this.signature) return;
    this.signature = signature;
    this._destroyEffects();
    if (!snapshot) return;
    const effects = snapshot.unlockedEffectIds || [];
    const ranks = snapshot.nodeRanks || {};
    const wayward = resolveCelestialTalentEngineDefinition(
      CELESTIAL_ENGINE_IDS.WAYWARD_STAR, effects, ranks,
    );
    const hollow = resolveCelestialTalentEngineDefinition(
      CELESTIAL_ENGINE_IDS.HOLLOW_SUN, effects, ranks,
    );
    const lance = resolveCelestialTalentEngineDefinition(
      CELESTIAL_ENGINE_IDS.STELLAR_RAGE, effects, ranks,
    );
    if (wayward?.companionEnabled) this._createWayward(wayward);
    if (hollow?.passiveHollowEnabled) this._createHollow(hollow);
    if (lance?.passiveLanceEnabled) this._createLance(lance, nowMs);
  }

  _common(definition, engineId) {
    const activationId = `apex:${engineId}:${++this.serial}`;
    return {
      scene: this.scene,
      definition,
      tileSize: this.tileSize,
      getAnchor: this.getAnchor,
      probeTile: this.probeTile,
      toTile: this.toTile,
      onImpact: (tx, ty, hitId, nowMs, damageScale) => this.onImpact?.({
        activationId,
        engineId,
        hitId,
        tx,
        ty,
        nowMs,
        damageScale,
      }),
    };
  }

  _createWayward(definition) {
    this.wayward = new WaywardStarCompanion({
      ...this._common(definition, CELESTIAL_ENGINE_IDS.WAYWARD_STAR),
      assetKey: ASSET_KEYS.celestialEngines.waywardStar,
    });
  }

  _createHollow(definition) {
    this.hollow = new HollowSunCompanion({
      ...this._common(definition, CELESTIAL_ENGINE_IDS.HOLLOW_SUN),
      assetKey: ASSET_KEYS.celestialEngines.hollowSun,
    });
  }

  _createLance(definition, nowMs) {
    const passiveDefinition = Object.freeze({
      ...definition,
      lifetimeMs: Number.MAX_SAFE_INTEGER,
      projectileRangeTiles: definition.passiveLanceRangeTiles,
      projectileDamageMultiplier: definition.passiveLanceDamageMultiplier,
      projectileSideLanes: 0,
      resonantEveryShots: 0,
      resonantSideLanes: 0,
      resonantDamageBonus: 0,
      breakChargePerDestroyedTile: 0,
      breakChargeMaximum: 0,
      lifetimeGainPerDestroyedTileMs: 0,
      lifetimeGainCapMs: 0,
      finalWindowMs: 0,
      finalWindowSideLanes: 0,
    });
    const budget = new CelestialActivationBudget(
      CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
      `apex:${CELESTIAL_ENGINE_IDS.STELLAR_RAGE}:${++this.serial}`,
      nowMs,
      passiveDefinition,
    );
    this.lance = new StellarRageEngine({
      scene: this.scene,
      budget,
      definitionOverride: passiveDefinition,
      passive: true,
      tileSize: this.tileSize,
      projectileAssetKeys: [
        ASSET_KEYS.celestialEngines.stellarLanceWaveBlue,
        ASSET_KEYS.celestialEngines.stellarLanceWavePurple,
        ASSET_KEYS.celestialEngines.stellarLanceWaveRed,
        ASSET_KEYS.celestialEngines.stellarLancePrismatic,
      ],
      impactAssetKey: ASSET_KEYS.celestialEngines.stellarLanceImpact,
      getAnchor: this.getAnchor,
      onComplete: () => {},
    });
  }

  handlePlayerDig(direction, nowMs) {
    this.wayward?.steer(direction);
    return this.hollow?.onPlayerDig(direction, nowMs) === true;
  }

  getLanceEmpowerSnapshot(nowMs) {
    const snapshot = this.lance?.getBuffSnapshot?.(nowMs);
    return snapshot?.active ? { ...snapshot, passiveEcho: true } : null;
  }

  launchProjectile(projectile) {
    return this.lance?.launchProjectile?.(projectile) === true;
  }

  getSnapshot(nowMs) {
    return {
      activeCount: [this.wayward, this.hollow, this.lance].filter(Boolean).length,
      wayward: this.wayward?.getSnapshot?.() || null,
      hollow: this.hollow?.getSnapshot?.() || null,
      lance: this.getLanceEmpowerSnapshot(nowMs),
    };
  }

  _destroyEffects() {
    this.wayward?.destroy();
    this.hollow?.destroy();
    this.lance?.destroy();
    this.wayward = null;
    this.hollow = null;
    this.lance = null;
  }

  destroy() {
    this._destroyEffects();
    this.signature = "";
  }
}

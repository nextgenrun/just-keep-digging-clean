import { CelestialActivationBudget } from
  "../systems/celestial/CelestialActivationBudget.js";
import { HollowSunClusterEngine } from
  "../systems/celestial/HollowSunClusterEngine.js?rev=20260831-actionbar-balance-v1";
import { StellarRageEngine } from
  "../systems/celestial/StellarRageEngine.js?rev=20260903-lance-wave-v1";
import { WaywardStarSwarmEngine } from
  "../systems/celestial/WaywardStarSwarmEngine.js";
import { CelestialEngineHudSystem } from
  "../systems/visual/CelestialEngineHudSystem.js";
import { installTileDestructionFxAtlasFrames } from
  "../systems/visual/tileDestructionFxAtlasFrames.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_CORE_ASSETS,
  CELESTIAL_ENGINE_IDS,
} from "../values/celestialEngines.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import { resolveCelestialTalentEngineDefinition } from
  "../values/celestialTalentEffects.js";
import { TILE_DESTRUCTION_FX_CONFIG } from "../values/tileDestructionFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";

const runtimeErrors = [];
window.addEventListener("error", event => {
  runtimeErrors.push(event.error?.message || event.message || "window-error");
});
window.addEventListener("unhandledrejection", event => {
  runtimeErrors.push(event.reason?.message || String(event.reason || "unhandled-rejection"));
});

const params = new URLSearchParams(location.search);
const requested = params.get("ability") || CELESTIAL_ENGINE_IDS.WAYWARD_STAR;
const aliases = Object.freeze({ wayward: "wayward-star", hollow: "hollow-sun", rage: "comet-engine" });
const engineId = aliases[requested] || requested;
const allowed = new Set(Object.values(aliases));
const selectedEngineId = allowed.has(engineId) ? engineId : CELESTIAL_ENGINE_IDS.WAYWARD_STAR;
const width = 1280;
const height = 720;
const tileSize = 48;

function fullDefinition(id) {
  const branch = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.find(item => item.id === id);
  return resolveCelestialTalentEngineDefinition(
    id,
    branch.nodes.filter(node => node.kind !== "ability").map(node => node.effectId),
  );
}

class CelestialAbilitiesHarnessScene extends Phaser.Scene {
  constructor() {
    super("CelestialAbilitiesHarnessScene");
  }

  preload() {
    this.load.image(ASSET_KEYS.celestialEngines.starHeart, `../${CELESTIAL_ENGINE_CORE_ASSETS.starHeart}`);
    this.load.image(ASSET_KEYS.celestialEngines.waywardStar, `../${CELESTIAL_ENGINE_CORE_ASSETS.waywardStar}`);
    this.load.image(ASSET_KEYS.celestialEngines.hollowSun, `../${CELESTIAL_ENGINE_CORE_ASSETS.hollowSun}`);
    this.load.image(ASSET_KEYS.celestialEngines.cometEngine, `../${CELESTIAL_ENGINE_CORE_ASSETS.cometEngine}`);
    for (const role of [
      "stellarLanceProjectile",
      "stellarLanceWaveBlue",
      "stellarLanceWavePurple",
      "stellarLanceWaveRed",
      "stellarLanceImpact",
    ]) {
      this.load.image(ASSET_KEYS.celestialEngines[role], `../${CELESTIAL_ENGINE_CORE_ASSETS[role]}`);
    }
    const core = TILE_DESTRUCTION_FX_CONFIG.assets.core;
    this.load.spritesheet(core.key, `../${core.path}`, {
      frameWidth: core.frameWidth,
      frameHeight: core.frameHeight,
    });
    const shards = TILE_DESTRUCTION_FX_CONFIG.assets.shards;
    this.load.spritesheet(shards.key, `../${shards.path}`, {
      frameWidth: shards.frameWidth,
      frameHeight: shards.frameHeight,
    });
  }

  create() {
    installTileDestructionFxAtlasFrames(this, TILE_DESTRUCTION_FX_CONFIG);
    this.definition = fullDefinition(selectedEngineId);
    this.impacts = 0;
    this.bounces = 0;
    this.completion = null;
    this.nextProjectileAt = 520;
    this.anchor = {
      x: selectedEngineId === CELESTIAL_ENGINE_IDS.STELLAR_RAGE
        ? width * 0.3
        : width / 2,
      y: height / 2,
    };
    this._drawBackdrop();
    this._createLabels();
    this._createHud();
    this.effect = this._createEffect();
    this._publish();
    document.body.dataset.celestialAbilitiesReady = "true";
  }

  _drawBackdrop() {
    const graphics = this.add.graphics().setDepth(-10);
    graphics.fillStyle(0x020711, 1).fillRect(0, 0, width, height);
    graphics.lineStyle(1, 0x16354a, 0.28);
    for (let x = 0; x <= width; x += tileSize) graphics.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += tileSize) graphics.lineBetween(0, y, width, y);
    graphics.lineStyle(2, this.definition.accent, 0.26);
    graphics.strokeRoundedRect(34, 84, width - 68, height - 150, 18);
    if (selectedEngineId === CELESTIAL_ENGINE_IDS.WAYWARD_STAR) {
      graphics.fillStyle(0x183246, 0.82);
      const centerTileX = Math.floor(width / tileSize / 2);
      graphics.fillRect((centerTileX - 6) * tileSize, 112, tileSize, height - 224);
      graphics.fillRect((centerTileX + 6) * tileSize, 112, tileSize, height - 224);
    }
    if (selectedEngineId === CELESTIAL_ENGINE_IDS.STELLAR_RAGE) {
      this.playerMarker = this.add.circle(this.anchor.x, this.anchor.y, 24, 0xf5d28b, 0.92)
        .setStrokeStyle(4, 0xffffff, 0.75)
        .setDepth(70);
    }
  }

  _createLabels() {
    this.add.text(width / 2, 30, `${this.definition.name}  •  FULL TALENTS`, {
      fontFamily: "Georgia, serif",
      fontSize: "26px",
      fontStyle: "bold",
      color: this.definition.cssAccent,
      stroke: "#02060a",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2000);
    this.status = this.add.text(28, height - 34, "", {
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      color: "#b9ddeb",
    }).setOrigin(0, 0.5).setDepth(2000);
  }

  _createHud() {
    const progression = {
      subscribe: () => () => {},
    };
    this.hud = new CelestialEngineHudSystem(this, progression, () => "X");
    this.hud.sync({
      unlocked: true,
      selectedEngine: selectedEngineId,
      charged: false,
      charge: 100,
      chargeCapacity: 200,
    });
  }

  _common() {
    return {
      scene: this,
      budget: new CelestialActivationBudget(
        selectedEngineId,
        `visual:${selectedEngineId}`,
        this.time.now,
        this.definition,
      ),
      definitionOverride: this.definition,
      tileSize,
      probeTile: (tx, ty) => this._probeTile(tx, ty),
      toTile: (x, y) => ({ tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) }),
      onImpact: () => { this.impacts += 1; },
      onBounce: () => { this.bounces += 1; },
      onComplete: (reason, health) => { this.completion = { reason, health }; },
    };
  }

  _createEffect() {
    const common = this._common();
    if (selectedEngineId === CELESTIAL_ENGINE_IDS.WAYWARD_STAR) {
      return new WaywardStarSwarmEngine({
        ...common,
        direction: { x: 1, y: 0 },
        startX: width / 2,
        startY: height / 2,
        assetKey: ASSET_KEYS.celestialEngines.waywardStar,
      });
    }
    if (selectedEngineId === CELESTIAL_ENGINE_IDS.HOLLOW_SUN) {
      return new HollowSunClusterEngine({
        ...common,
        direction: { x: 1, y: 0 },
        x: width / 2 - tileSize,
        y: height / 2 + tileSize * 0.6,
        assetKey: ASSET_KEYS.celestialEngines.hollowSun,
      });
    }
    return new StellarRageEngine({
      ...common,
      projectileAssetKeys: [
        ASSET_KEYS.celestialEngines.stellarLanceWaveBlue,
        ASSET_KEYS.celestialEngines.stellarLanceWavePurple,
        ASSET_KEYS.celestialEngines.stellarLanceWaveRed,
      ],
      impactAssetKey: ASSET_KEYS.celestialEngines.stellarLanceImpact,
      getAnchor: () => this.anchor,
    });
  }

  _launchHarnessProjectile(time) {
    if (time < this.nextProjectileAt || this.effect?.active !== true) return;
    this.nextProjectileAt = time + 920;
    const direction = Math.floor(time / 1840) % 2 === 0
      ? { x: 1, y: 0 }
      : { x: -1, y: 0 };
    const anchorTile = {
      tx: Math.floor(this.anchor.x / tileSize),
      ty: Math.floor(this.anchor.y / tileSize),
    };
    const targetTile = {
      tx: anchorTile.tx + direction.x,
      ty: anchorTile.ty,
    };
    const lanes = Array.from(
      { length: this.definition.projectileSideLanes * 2 + 1 },
      (_, index) => index - this.definition.projectileSideLanes,
    );
    const viewportEndTileX = direction.x > 0 ? Math.floor(width / tileSize) - 3 : 2;
    const viewportDistance = Math.abs(viewportEndTileX - targetTile.tx) + 1;
    const endDistance = this.definition.projectileInfiniteRange
      ? viewportDistance
      : Math.min(viewportDistance, this.definition.projectileRangeTiles);
    const endTileX = targetTile.tx + direction.x * (endDistance - 1);
    const resolveState = distance => {
      let selected = this.definition.projectileStates[0];
      this.definition.projectileStates.forEach((state, index) => {
        if (distance >= state.minimumDistanceTiles) selected = { ...state, index };
      });
      return selected;
    };
    const stateFields = distance => {
      const state = resolveState(distance);
      return {
        projectileStateId: state.id,
        projectileStateIndex: state.index,
        projectileStateDamageMultiplier: state.damageMultiplier,
      };
    };
    const endTiles = lanes.map(lane => ({
      tx: endTileX,
      ty: targetTile.ty + lane,
      lane,
      distance: endDistance,
      ...stateFields(endDistance),
    }));
    const visualPaths = endTiles.map(endTile => ({
      lane: endTile.lane,
      transitions: this.definition.projectileStates
        .map(state => state.minimumDistanceTiles)
        .filter(distance => distance <= endDistance)
        .map(distance => ({
          tx: targetTile.tx + direction.x * (distance - 1),
          ty: targetTile.ty + endTile.lane,
          lane: endTile.lane,
          distance,
          ...stateFields(distance),
        })),
      endTile,
    }));
    const hitDistances = [2, 4, 7, 10].filter(distance => distance <= endDistance);
    const hits = lanes.flatMap(lane => hitDistances.map(distance => ({
      tx: targetTile.tx + direction.x * (distance - 1),
      ty: targetTile.ty + lane,
      lane,
      distance,
      ...stateFields(distance),
    })));
    this.effect.launchProjectile({
      direction,
      targetTile,
      rangeTiles: this.definition.projectileRangeTiles,
      infiniteRange: this.definition.projectileInfiniteRange,
      traversedRangeTiles: endDistance,
      endTiles,
      visualPaths,
      hits,
      impactedCount: hits.length,
      destroyedCount: hits.length,
    });
  }

  _probeTile(tx, ty) {
    const inBounds = tx >= 2 && tx < width / tileSize - 2 && ty >= 5 && ty < height / tileSize - 4;
    const centerTileX = Math.floor(width / tileSize / 2);
    const waywardWall = selectedEngineId === CELESTIAL_ENGINE_IDS.WAYWARD_STAR
      && (tx === centerTileX - 6 || tx === centerTileX + 6);
    return {
      solid: !inBounds || waywardWall,
      diggable: inBounds,
      type: TILE_TYPES.DIRT,
    };
  }

  update(time, delta) {
    if (this.effect?.active === false) {
      this.effect = this._createEffect();
      this.nextProjectileAt = time + 120;
    }
    if (selectedEngineId === CELESTIAL_ENGINE_IDS.STELLAR_RAGE) {
      this.anchor.x = width / 2 + Math.sin(time / 700) * 135;
      this.anchor.y = height / 2 + Math.cos(time / 950) * 35;
      this.playerMarker?.setPosition(this.anchor.x, this.anchor.y);
      this._launchHarnessProjectile(time);
    }
    this.effect?.update(time, delta);
    const snapshot = this.effect?.getSnapshot?.(time)
      || this.effect?.getBuffSnapshot?.(time)
      || null;
    this.hud.setActiveSnapshot(snapshot);
    const abilityDetail = snapshot?.holeCount
      ? `HOLES ${snapshot.activeHoles}/${snapshot.holeCount}`
      : snapshot?.projectileEnabled
        ? `SHOTS ${snapshot.shotsFired}  •  RANGE ${this.definition.projectileInfiniteRange ? "∞" : this.definition.projectileRangeTiles}  •  FORMS ${snapshot.projectileStateCount}`
        : `BOUNCES ${this.bounces}`;
    this.status.setText(`IMPACTS ${snapshot?.impacts ?? this.impacts}  •  ${abilityDetail}`);
    this._publish(snapshot);
  }

  _publish(snapshot = null) {
    const missingTextures = Object.values(ASSET_KEYS.celestialEngines)
      .filter(key => !this.textures.exists(key));
    document.body.dataset.celestialAbilitiesSnapshot = JSON.stringify({
      ready: true,
      engineId: selectedEngineId,
      definition: {
        name: this.definition.name,
        lifetimeMs: this.definition.lifetimeMs,
        simultaneousStars: this.definition.simultaneousStars || 0,
        simultaneousHoles: this.definition.simultaneousHoles || 0,
        projectileInfiniteRange: this.definition.projectileInfiniteRange === true,
        projectileRangeTiles: this.definition.projectileInfiniteRange
          ? "infinite"
          : this.definition.projectileRangeTiles || 0,
        projectileDamageMultiplier: this.definition.projectileDamageMultiplier || 0,
        projectileMaximumDamageMultiplier:
          this.effect?.getBuffSnapshot?.(this.time.now)?.projectileMaximumDamageMultiplier || 0,
        projectileStateCount: this.definition.projectileStates?.length || 0,
        projectileSideLanes: this.definition.projectileSideLanes || 0,
      },
      snapshot,
      impacts: this.impacts,
      bounces: this.bounces,
      pulledFragments: this.effect?.children?.reduce(
        (sum, child) => sum + (child.pulledFragmentCount || 0),
        0,
      ) || this.effect?.pulledFragmentCount || 0,
      livePulledFragments: this.effect?.children?.reduce(
        (sum, child) => sum + (child.pulledFragments?.size || 0),
        0,
      ) || this.effect?.pulledFragments?.size || 0,
      liveProjectiles: this.effect?.projectiles?.size || 0,
      missingTextures,
      runtimeErrors: [...runtimeErrors],
      completion: this.completion,
    });
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: document.body,
  width,
  height,
  backgroundColor: 0x02060a,
  render: { antialias: true, roundPixels: false },
  scene: [CelestialAbilitiesHarnessScene],
});

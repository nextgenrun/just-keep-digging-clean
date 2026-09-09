import { LootPickupFxSystem } from "../systems/visual/LootPickupFxSystem.js";
import { RewardFlightMotionSystem } from "../systems/visual/RewardFlightMotionSystem.js";
import { RewardPickupVisualResolver } from "../systems/visual/RewardPickupVisualResolver.js";
import { getRememberedResourcePickupVisual, getRememberedSpecialPickupVisual } from
  "../systems/visual/RewardPickupContinuityState.js";
import { installStarIdentityTextureFrames } from
  "../systems/visual/installStarIdentityTextureFrames.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { LOOT_PICKUP_PRESENTATION } from "../values/lootPickupPresentation.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../values/starIdentityLibrary.js";
import { getStarIdentitiesForRarity } from "../values/starIdentityLibraryMath.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";
const RESOURCE_IDS = new Set(["dirt", "copper", "gold", "magmaCrystal"]);
const SPECIALS = Object.freeze({
  gp: TILE_TYPES.GEM_POWER_BLOCK,
  xp: TILE_TYPES.XP_BLOCK,
  legend: TILE_TYPES.LEGEND_BLOCK,
});
const RUNTIME_ERRORS = [];
window.addEventListener("error", event => {
  RUNTIME_ERRORS.push(String(event.error?.message || event.message || "error"));
});
window.addEventListener("unhandledrejection", event => {
  RUNTIME_ERRORS.push(String(event.reason?.message || event.reason || "rejection"));
});
class LootPickupHarnessScene extends Phaser.Scene {
  constructor() {
    super("loot-pickup-continuity-v2");
    this.sourceObjects = [];
    this.lastSourceDescriptor = null;
    this.lastTriggerId = null;
    this.settled = true;
  }
  preload() {
    this.load.image(
      ASSET_KEYS.ui.approvedHud.inventory,
      `../${APPROVED_HUD_SKIN.paths.inventory}`,
    );
    const soil = LOOT_PICKUP_PRESENTATION.assets.soilMinis;
    this.load.image(soil.key, `../${soil.path.split("?")[0]}`);
    for (const atlas of [
      WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas,
      WORLD_VISUAL_SEMANTIC_ASSETS.specialBlocks.beautyAtlas,
    ]) this.load.image(atlas.key, `../${atlas.path.split("?")[0]}`);
    for (const rarity of [0, 5]) {
      const core = STAR_IDENTITY_LIBRARY_CONFIG.atlases[rarity];
      const light = STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases[rarity];
      this.load.image(core.key, `../${core.path.split("?")[0]}`);
      this.load.image(light.key, `../${light.path.split("?")[0]}`);
    }
  }

  create() {
    this.config = { tileSize: 64, lootVisuals: true, featureFlags: {} };
    this.cameras.main.setBackgroundColor(0x061019);
    this.motion = new RewardFlightMotionSystem();
    this.resolver = new RewardPickupVisualResolver(this);
    installStarIdentityTextureFrames(this);
    this.inventoryBag = this.add.image(
      this.scale.width - 66,
      this.scale.height - 68,
      ASSET_KEYS.ui.approvedHud.inventory,
    ).setScrollFactor(0).setDepth(70).setDisplaySize(86, 86).setAlpha(0.94);
    this.bagBase = { x: this.inventoryBag.scaleX, y: this.inventoryBag.scaleY };
    this.loot = new LootPickupFxSystem(this, {
      getLootPickupTarget: () => ({ x: this.inventoryBag.x, y: this.inventoryBag.y }),
      pulseLootTarget: (_resource, strong) => this._pulseBag(strong),
    }, this.motion, this.resolver);
    this.title = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.29,
      "LOOT PICKUP CONTINUITY V2",
      { fontFamily: "Consolas, monospace", fontSize: "18px", color: "#d8c58e" },
    ).setOrigin(0.5).setAlpha(0.9);
    this.subtitle = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.345,
      "326 authored visuals • 24 paths • soft exact-frame echoes • live I target",
      { fontFamily: "Consolas, monospace", fontSize: "11px", color: "#7f98a8" },
    ).setOrigin(0.5);
    this.telemetry = this.add.text(
      this.scale.width / 2,
      this.scale.height * 0.43,
      "TRIGGER: —\nVISUAL: —\nROUTE: —",
      { fontFamily: "Consolas, monospace", fontSize: "12px", color: "#d0aa55", align: "center" },
    ).setOrigin(0.5).setAlpha(0.86);
    document.querySelectorAll("[data-fx]").forEach(button => (
      button.addEventListener("click", () => this._trigger(button.dataset.fx))
    ));
    this.scale.on("resize", () => this._resize());
    window.__lootHarnessTrigger = id => this._trigger(String(id || ""));
    window.__lootHarnessSnapshot = () => this._snapshot();
    this._publishState();
    this.events.once("shutdown", () => {
      this.loot.destroy();
      this.motion.destroy();
      this._clearSource();
      delete window.__lootHarnessTrigger;
      delete window.__lootHarnessSnapshot;
    });
  }
  update() { if (!this.settled) this._publishState(); }
  _trigger(id) {
    if (!RESOURCE_IDS.has(id) && !SPECIALS[id] && !/Star$/.test(id)) return false;
    this._clearSource();
    this.lastTriggerId = id;
    this.settled = false;
    const source = this._sourcePoint();
    if (RESOURCE_IDS.has(id)) this._triggerResource(id, source);
    else if (SPECIALS[id]) this._triggerSpecial(SPECIALS[id], source);
    else this._triggerStar(id === "astralStar" ? 5 : 0, source);
    this._publishState();
    this.time.delayedCall(380, () => this._showTelemetry());
    this.time.delayedCall(2100, () => {
      this.settled = true;
      this._publishState();
    });
    return true;
  }
  _triggerResource(resourceType, source) {
    const tile = { x: resourceType === "dirt" ? 2 : 17, y: resourceType === "gold" ? 43 : 29 };
    const descriptor = this.resolver.resolveResourcePickup({
      resourceType, tileX: tile.x, tileY: tile.y,
    });
    this._showSource(descriptor, source, 76);
    this.loot.showResourcePickup({
      worldX: source.x,
      worldY: source.y,
      resourceType,
      amount: resourceType === "gold" ? 3 : 1,
      tileX: tile.x,
      tileY: tile.y,
    });
  }
  _triggerSpecial(tileType, source) {
    const descriptor = this.resolver.resolveSpecialPickup({
      tileType,
      depthTiles: 780,
      gemPowerTierId: tileType === TILE_TYPES.GEM_POWER_BLOCK ? "gp1000" : null,
    });
    this._showSource(descriptor, source, 78);
    this.loot.showSpecialTilePickup({
      worldX: source.x,
      worldY: source.y,
      tileType,
      depthTiles: 780,
      gemPowerTierId: tileType === TILE_TYPES.GEM_POWER_BLOCK ? "gp1000" : null,
      specialEffect: "harness",
    });
  }
  _triggerStar(rarity, source) {
    const identities = getStarIdentitiesForRarity(rarity);
    const identity = identities[Math.min(identities.length - 1, rarity * 2)];
    const descriptor = Object.freeze({
      visualId: `star:${identity.id}`,
      kind: "star",
      textureKey: STAR_IDENTITY_LIBRARY_CONFIG.atlases[rarity].key,
      textureFrame: identity.frameName,
      lightTextureKey: STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases[rarity].key,
      lightTextureFrame: identity.lightFrameName,
      identityId: identity.id,
      identityIndex: identity.index,
      rarity,
    });
    const rising = this._showSource(descriptor, source, 92, true);
    this.tweens.add({
      targets: rising,
      y: source.y - 150,
      alpha: 0,
      duration: 1900,
      ease: "Sine.easeInOut",
    });
    this.time.delayedCall(280, () => this.loot.showStarPickup({
      ...descriptor,
      worldX: rising.x,
      worldY: rising.y,
      resourceType: "silver",
      progress: Object.freeze({
        identityId: identity.id,
        identityIndex: identity.index,
        rarity,
        resourceType: "silver",
        materialAmount: 1,
        identityNewlyDiscovered: true,
      }),
    }));
  }
  _showSource(descriptor, source, size, layered = false) {
    this.lastSourceDescriptor = descriptor;
    if (layered && descriptor.lightTextureKey) {
      const root = this.add.container(source.x, source.y).setDepth(20);
      const light = this.add.image(0, 0, descriptor.lightTextureKey, descriptor.lightTextureFrame)
        .setDisplaySize(size * 1.18, size * 1.18).setAlpha(0.46);
      light.setBlendMode(Phaser.BlendModes.ADD);
      root.add(light);
      root.add(this.add.image(0, 0, descriptor.textureKey, descriptor.textureFrame)
        .setDisplaySize(size, size).setBlendMode(Phaser.BlendModes.SCREEN));
      this.sourceObjects.push(root);
      return root;
    }
    const image = this.add.image(
      source.x, source.y, descriptor.textureKey,
      descriptor.textureFrame || descriptor.frameName || undefined,
    ).setDepth(20).setDisplaySize(size, size);
    this.sourceObjects.push(image);
    return image;
  }
  _showTelemetry() {
    const item = this.loot.lastTelemetry;
    const sourceFrame = this.lastSourceDescriptor?.textureFrame
      ?? this.lastSourceDescriptor?.frameName ?? null;
    const exact = item?.textureKey === this.lastSourceDescriptor?.textureKey
      && item?.textureFrame === sourceFrame
      && (item?.lightTextureKey ?? null) === (this.lastSourceDescriptor?.lightTextureKey ?? null)
      && (item?.lightTextureFrame ?? null) === (this.lastSourceDescriptor?.lightTextureFrame ?? null);
    this.telemetry.setText([
      `TRIGGER: ${this.lastTriggerId?.toUpperCase()} • EXACT SOURCE→FLIGHT: ${exact ? "YES" : "NO"}`,
      `VISUAL: ${item?.visualId || "—"} • MOMENT: ${item?.momentId || "—"}`,
      `ROUTE: ${item?.profileId || "—"} • ${item?.routeId || "—"}`,
      `RARE REWARD: ${item?.rareRewardPath ? "YES" : "NO"} • SOFT ECHOES: ${item?.softEchoCount ?? 0}`,
    ]);
    this._publishState();
  }
  _snapshot() {
    const item = this.loot?.lastTelemetry || null;
    const sourceFrame = this.lastSourceDescriptor?.textureFrame
      ?? this.lastSourceDescriptor?.frameName ?? null;
    const inventory = this.lastSourceDescriptor?.kind === "resource"
      ? getRememberedResourcePickupVisual(this, this.lastSourceDescriptor.resourceType)
      : getRememberedSpecialPickupVisual(this, this.lastSourceDescriptor?.tileType);
    const inventoryFrame = inventory?.textureFrame ?? inventory?.frameName ?? null;
    return {
      ready: Boolean(this.loot && this.resolver && this.inventoryBag),
      settled: this.settled,
      triggerId: this.lastTriggerId,
      activeFlights: this.loot?.activeFlights?.length || 0,
      activeSoftEchoes: this.loot?.activeFlights?.reduce(
        (sum, flight) => sum + (flight.softEchoes?.length || 0), 0) || 0,
      reducedMotion: this.loot?.flightView?.reducedMotion === true,
      telemetry: item ? { ...item } : null,
      sourceTextureKey: this.lastSourceDescriptor?.textureKey || null,
      sourceTextureFrame: sourceFrame,
      exactSourceFlight: Boolean(item
        && item.textureKey === this.lastSourceDescriptor?.textureKey
        && item.textureFrame === sourceFrame
        && (item.lightTextureFrame ?? null)
          === (this.lastSourceDescriptor?.lightTextureFrame ?? null)),
      exactFlightInventory: inventory ? item?.textureKey === inventory.textureKey
        && item?.textureFrame === inventoryFrame : null,
      inventoryTextureFrame: inventoryFrame,
      runtimeErrors: [...RUNTIME_ERRORS],
      arrivalTarget: this.loot?.lastArrivalTarget ? { ...this.loot.lastArrivalTarget } : null,
      bagTarget: { x: this.inventoryBag.x, y: this.inventoryBag.y },
    };
  }
  _publishState() {
    const output = document.getElementById("harness-state");
    if (output) output.textContent = JSON.stringify(this._snapshot());
  }
  _sourcePoint() {
    return { x: this.scale.width * 0.39, y: this.scale.height * 0.62 };
  }
  _clearSource() {
    this.sourceObjects.forEach(object => object?.active !== false && object.destroy());
    this.sourceObjects.length = 0;
  }

  _pulseBag(strong) {
    this.tweens.killTweensOf(this.inventoryBag);
    this.inventoryBag.setScale(this.bagBase.x, this.bagBase.y).setAlpha(0.94);
    this.tweens.add({
      targets: this.inventoryBag,
      scaleX: this.bagBase.x * (strong ? 1.1 : 1.05),
      scaleY: this.bagBase.y * (strong ? 1.1 : 1.05),
      alpha: 1,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  _resize() {
    this.title.setPosition(this.scale.width / 2, this.scale.height * 0.29);
    this.subtitle.setPosition(this.scale.width / 2, this.scale.height * 0.345);
    this.telemetry.setPosition(this.scale.width / 2, this.scale.height * 0.43);
    this.inventoryBag.setPosition(this.scale.width - 66, this.scale.height - 68);
    this._publishState();
  }
}

window.__lootHarnessGame = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: "game",
  backgroundColor: "#061019",
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  render: { antialias: true, pixelArt: false, roundPixels: true },
  scene: [LootPickupHarnessScene],
});

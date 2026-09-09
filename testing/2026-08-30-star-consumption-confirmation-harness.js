import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";
import { STAR_SANCTUARY_COPY } from "../values/playerFacingCopy.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../values/starIdentityLibrary.js";
import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  resolveWorldVisualSemanticResourceFrame,
} from "../values/worldVisualSemanticAssets.js";
import { RESOURCE_BY_TILE_TYPE } from "../values/resourceTypes.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  getTileDestructionFxPreloadAssets,
} from "../values/tileDestructionFx.js";
import { StarSanctuarySystem } from
  "../systems/environment/StarSanctuarySystem.js";
import { WorldMapStarTerritorySystem } from
  "../systems/map/WorldMapStarTerritorySystem.js";
import { installStarIdentityTextureFrames } from
  "../systems/visual/installStarIdentityTextureFrames.js";
import { StarConsumptionHoldView } from
  "../systems/visual/StarConsumptionHoldView.js";
import { StarlessScarView } from "../systems/visual/StarlessScarView.js";
import { StarScarResourcePresentationSystem } from
  "../systems/visual/StarScarResourcePresentationSystem.js";
import { TileDestructionFxSystem } from
  "../systems/visual/TileDestructionFxSystem.js";
import { HardcoreModalOverlay } from
  "../ui/overlays/HardcoreModalOverlay.js";

const WIDTH = 1280;
const HEIGHT = 720;
const TILE_SIZE = 64;
const STAR = Object.freeze({ tx: 9, ty: 4 });
const IDENTITY_INDEX = 37;
const RARITY_INDEX = 3;
const assetPath = path => `../${path}`;
const RESOURCE_TYPES = Object.freeze([
  TILE_TYPES.COPPER,
  TILE_TYPES.STONE,
  TILE_TYPES.IRON,
  TILE_TYPES.BRONZE,
  TILE_TYPES.SILVER,
  TILE_TYPES.GOLD,
]);

class HarnessResourceLayer {
  constructor(scene, worldModel) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.resourceDepletionProvider = null;
    this.images = [];
  }

  create() {
    const atlas = WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas;
    const texture = this.scene.textures.get(atlas.key);
    for (let index = 0; index < atlas.frameCount; index += 1) {
      const name = `${atlas.framePrefix}${index}`;
      if (!texture.has(name)) texture.add(
        name,
        0,
        (index % atlas.columns) * atlas.frameSizePx,
        Math.floor(index / atlas.columns) * atlas.frameSizePx,
        atlas.frameSizePx,
        atlas.frameSizePx,
      );
    }
    for (let ty = 1; ty < this.worldModel.depthTiles; ty += 1) {
      for (let tx = 0; tx < this.worldModel.widthTiles; tx += 1) {
        const tileType = this.worldModel.getTileType(tx, ty);
        const resourceKey = RESOURCE_BY_TILE_TYPE[tileType];
        if (!resourceKey || tileType === TILE_TYPES.DIRT) continue;
        const frame = resolveWorldVisualSemanticResourceFrame(
          tx,
          ty,
          resourceKey,
        );
        const image = this.scene.add.image(
          (tx + 0.5) * TILE_SIZE,
          (ty + 0.5) * TILE_SIZE,
          atlas.key,
          `${atlas.framePrefix}${frame}`,
        ).setDisplaySize(TILE_SIZE * 0.88, TILE_SIZE * 0.88)
          .setDepth(2.41);
        this.images.push({ tx, ty, tileType, resourceKey, image });
      }
    }
    this.invalidateResourcePresentation();
  }

  setResourceDepletionProvider(provider) {
    this.resourceDepletionProvider = typeof provider === "function" ? provider : null;
    this.invalidateResourcePresentation();
  }

  invalidateResourcePresentation() {
    for (const entry of this.images) {
      const depleted = this.resourceDepletionProvider?.({
        tileX: entry.tx,
        tileY: entry.ty,
        tileType: entry.tileType,
        resourceKey: entry.resourceKey,
      }) === true;
      entry.image.setVisible(!depleted);
    }
  }

  getVisibleCount() {
    return this.images.filter(entry => entry.image.visible).length;
  }

  destroy() {
    this.images.forEach(entry => entry.image.destroy());
    this.images = [];
    this.resourceDepletionProvider = null;
  }
}

class HarnessWorld {
  constructor() {
    this.widthTiles = WIDTH / TILE_SIZE;
    this.depthTiles = HEIGHT / TILE_SIZE;
    this.tileSize = TILE_SIZE;
    this.topAirRows = 0;
    this.consumed = false;
  }

  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0
      && tx < this.widthTiles && ty < this.depthTiles;
  }

  getTileType(tx, ty) {
    if (tx === STAR.tx && ty === STAR.ty) {
      return this.consumed ? TILE_TYPES.AIR : TILE_TYPES.SKY_TILE;
    }
    return RESOURCE_TYPES[(tx + ty * 3) % RESOURCE_TYPES.length];
  }

  getDugTileSource(tx, ty) {
    if (!this.consumed || tx !== STAR.tx || ty !== STAR.ty) return null;
    return { tx, ty, type: TILE_TYPES.SKY_TILE };
  }

  getSkyTileIdentity(tx, ty) {
    return tx === STAR.tx && ty === STAR.ty ? IDENTITY_INDEX : 0;
  }

  getSkyTileRarity(tx, ty) {
    return tx === STAR.tx && ty === STAR.ty ? RARITY_INDEX : 0;
  }
}

class StarConsumptionConfirmationHarness extends Phaser.Scene {
  constructor() {
    super("StarConsumptionConfirmationHarness");
    this.worldModel = new HarnessWorld();
    this.identity = getStarIdentity(IDENTITY_INDEX);
    this.system = null;
    this.modal = null;
    this.holdView = null;
    this.scarView = null;
    this.starObjects = [];
    this.spaceKey = null;
    this.holdStarted = false;
    this.holdComplete = false;
    this.keyboardCapture = null;
    this.captureValue = "";
    this.captureInputHandler = null;
    this.captureKeyHandler = null;
    this.resourceLayer = null;
    this.resourcePresentationSystem = null;
    this.tileDestructionFxSystem = null;
    this.maximumResourceBreakSprites = 0;
  }

  preload() {
    const assets = [
      WORLD_VISUAL_MATERIALS.shallowBlue,
      ...Object.values(STAR_SANCTUARY_CONFIG.scar.visual.assets),
      WORLD_VISUAL_SEMANTIC_ASSETS.resources.atlas,
      ...getTileDestructionFxPreloadAssets(TILE_DESTRUCTION_FX_CONFIG),
      HARDCORE_MODE_CONFIG.assets.panel,
      {
        key: STAR_SANCTUARY_CONFIG.consumption.holdUi.holdFrameKey,
        path: STAR_SANCTUARY_CONFIG.consumption.holdUi.holdFramePath,
      },
      ...STAR_IDENTITY_LIBRARY_CONFIG.atlases,
      ...STAR_IDENTITY_LIBRARY_CONFIG.lightAtlases,
    ];
    assets.forEach(asset => this.load.image(asset.key, assetPath(asset.path)));
  }

  create() {
    installStarIdentityTextureFrames(this);
    this.cameras.main.setBackgroundColor(0x02040a);
    this._drawWorld();
    this.resourceLayer = new HarnessResourceLayer(this, this.worldModel);
    this.worldRenderer = this.resourceLayer;
    this.resourceLayer.create();
    this._drawStar();
    this._drawInstructions();
    this.worldMapStarTerritorySystem = new WorldMapStarTerritorySystem(
      this.worldModel,
    );
    this.system = new StarSanctuarySystem(
      this.worldModel,
      STAR_SANCTUARY_CONFIG,
      {
        enabled: true,
        consumptionAcknowledged: false,
        territorySystem: this.worldMapStarTerritorySystem,
      },
    );
    this._starSanctuaryRuntime = { system: this.system };
    this.holdView = new StarConsumptionHoldView(
      this,
      STAR_SANCTUARY_CONFIG,
    );
    this.scarView = new StarlessScarView(
      this,
      this.worldModel,
      STAR_SANCTUARY_CONFIG,
    );
    this._starSanctuaryRuntime.view = this.scarView;
    this.tileDestructionFxSystem = new TileDestructionFxSystem(this);
    this.resourcePresentationSystem = new StarScarResourcePresentationSystem(
      this,
      this.worldModel,
      this.worldMapStarTerritorySystem,
    );
    this.resourcePresentationSystem.create();
    this.modal = new HardcoreModalOverlay(this, HARDCORE_MODE_CONFIG);
    this._installKeyboardCapture();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this._openFirstTimeWarning();
    document.body.dataset.starConsumptionHarnessReady = "true";
    document.body.dataset.stage = "typed-confirmation";
    document.body.dataset.confirmationWord = "DESTROY";
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._destroyViews());
  }

  _drawWorld() {
    this.add.tileSprite(
      WIDTH / 2,
      HEIGHT / 2,
      WIDTH,
      HEIGHT,
      WORLD_VISUAL_MATERIALS.shallowBlue.key,
    ).setDepth(0.1).setTint(0x8193ae);
    const shade = this.add.graphics().setDepth(0.2);
    shade.fillGradientStyle(0x07101c, 0x07101c, 0x02050a, 0x02050a, 0.45);
    shade.fillRect(0, 0, WIDTH, HEIGHT);
  }

  _drawStar() {
    const x = (STAR.tx + 0.5) * TILE_SIZE;
    const y = (STAR.ty + 0.5) * TILE_SIZE;
    const profile = this.system?.getProfileAt(STAR.tx, STAR.ty);
    const diameter = (profile?.radiusTiles || 1.8) * TILE_SIZE * 2;
    const light = this.add.image(
      x,
      y,
      this.identity.lightAtlasKey,
      this.identity.lightFrameName,
    ).setDisplaySize(diameter, diameter)
      .setAlpha(0.78)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(51);
    const core = this.add.image(
      x,
      y,
      this.identity.atlasKey,
      this.identity.frameName,
    ).setDisplaySize(TILE_SIZE * 1.38, TILE_SIZE * 1.38)
      .setDepth(55);
    this.starObjects = [light, core];
  }

  _drawInstructions() {
    this.add.text(WIDTH / 2, 28, "FIRST STAR SACRIFICE SAFETY FLOW", {
      color: "#f6ecdc",
      fontFamily: "Consolas, monospace",
      fontSize: "24px",
      fontStyle: "bold",
      stroke: "#02040a",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(100);
    this.hint = this.add.text(
      WIDTH / 2,
      HEIGHT - 36,
      "READ THE WARNING • TYPE DESTROY • PRESS ENTER",
      {
        color: "#ffd0a4",
        fontFamily: "Consolas, monospace",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#02040a",
        strokeThickness: 4,
      },
    ).setOrigin(0.5).setDepth(4110);
  }

  _openFirstTimeWarning() {
    const damage = { ...STAR, tileX: STAR.tx, tileY: STAR.ty, type: TILE_TYPES.SKY_TILE };
    this.system.shouldBlockDamage(damage, this.time.now);
    this.system.update(0, { nowMs: this.time.now });
    this.system.drainEvents();
    const copy = STAR_SANCTUARY_COPY.acknowledgement;
    this.modal.showConfirmation({
      title: copy.title,
      subtitle: copy.subtitle,
      body: copy.body,
      footer: copy.footer,
      footerColor: copy.footerColor,
      confirmationWord: copy.confirmationWord,
      typedInstruction: copy.typedInstruction,
      onConfirm: () => {
        this.system.acknowledgeConsumptionRisk();
        this.hint.setText("NOW HOLD SPACE TO MINE • RELEASE TO CANCEL");
        document.body.dataset.typedConfirmed = "true";
        document.body.dataset.stage = "hold-warning";
        return true;
      },
      onCancel: () => {
        this.system.cancelConsumptionAttempt();
        this.hint.setText("STAR KEPT • REFUGE REMAINS SAFE");
        document.body.dataset.cancelled = "true";
        document.body.dataset.stage = "cancelled";
      },
    });
  }

  _installKeyboardCapture() {
    const capture = document.getElementById("keyboard-capture");
    if (!capture) return;
    this.keyboardCapture = capture;
    this.captureValue = String(capture.value || "").toUpperCase();
    this.captureInputHandler = () => {
      const next = String(capture.value || "").toUpperCase();
      if (this.modal?.isVisible) {
        let shared = 0;
        while (
          shared < this.captureValue.length
          && shared < next.length
          && this.captureValue[shared] === next[shared]
        ) shared += 1;
        for (let index = shared; index < this.captureValue.length; index += 1) {
          this.modal._handleKey({ key: "Backspace" });
        }
        for (const key of next.slice(shared)) this.modal._handleKey({ key });
      }
      this.captureValue = next;
    };
    this.captureKeyHandler = event => {
      if (!this.modal?.isVisible || !["Enter", "Escape"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      this.modal._handleKey({ key: event.key });
    };
    capture.addEventListener("input", this.captureInputHandler);
    capture.addEventListener("keydown", this.captureKeyHandler);
  }

  update(time, delta) {
    if (!this.system || this.modal?.isVisible) {
      this.scarView?.update();
      this.resourcePresentationSystem?.update(time);
      this._publishResourceSnapshot();
      return;
    }
    if (this.holdComplete) {
      this.scarView.update();
      this.resourcePresentationSystem.update(time);
      this._publishScarSnapshot();
      this._publishResourceSnapshot();
      return;
    }
    const holding = this.spaceKey?.isDown === true
      || document.getElementById("keyboard-capture")?.value === "HOLD";
    const target = holding ? STAR : null;
    if (holding) {
      const blocked = this.system.shouldBlockDamage({
        tileX: STAR.tx,
        tileY: STAR.ty,
        type: TILE_TYPES.SKY_TILE,
      }, time);
      this.holdStarted = true;
      if (!blocked) this._consumeStar();
    } else if (this.holdStarted) {
      this.holdStarted = false;
    }
    const snapshot = this.system.update(delta, {
      nowMs: time,
      playerTile: STAR,
      consumptionHeld: holding,
      consumptionTarget: target,
    });
    this.holdView.update(snapshot.pendingConsumption);
    this.scarView.update();
    this.resourcePresentationSystem.update(time);
    document.body.dataset.holdProgress = String(
      Math.round((snapshot.pendingConsumption?.progress || 0) * 100),
    );
    this._publishScarSnapshot();
    this._publishResourceSnapshot();
  }

  _consumeStar() {
    this.worldModel.consumed = true;
    this.holdComplete = true;
    const spreadStarted = this.scarView.startSpread(
      this.system.getProfileAt(STAR.tx, STAR.ty),
      this.time.now,
    );
    document.body.dataset.spreadStarted = String(spreadStarted);
    document.body.dataset.spreadStartedAt = this.time.now.toFixed(1);
    this.starObjects.forEach(object => object.setVisible(false));
    this.holdView.update(null);
    this.hint.setText("LAST STAR CONSUMED • THE WHOLE UNDERGROUND IS SCARRED");
    document.body.dataset.holdConfirmed = "true";
    document.body.dataset.stage = "consumed";
  }

  _publishScarSnapshot() {
    const scar = this.scarView.getSnapshot();
    document.body.dataset.previewVisible = String(scar.previewVisible);
    document.body.dataset.previewAllTerritories = String(
      scar.previewAllTerritories,
    );
    document.body.dataset.previewRadius = scar.previewRadiusTiles.toFixed(2);
    document.body.dataset.spreadActive = String(scar.spreadActive);
    document.body.dataset.spreadComplete = String(scar.spreadComplete);
    document.body.dataset.spreadProgress = scar.spreadProgress.toFixed(3);
    document.body.dataset.spreadRadius = scar.spreadRadiusTiles.toFixed(2);
    document.body.dataset.scarGroundReady = String(scar.groundReady);
    document.body.dataset.scarCenterReady = String(scar.centerReady);
    document.body.dataset.scarFrontierReady = String(scar.frontierReady);
    document.body.dataset.scarFrontierCount = String(
      scar.visibleFrontierCount,
    );
  }

  _publishResourceSnapshot() {
    const collapse = this.resourcePresentationSystem?.getSnapshot?.() || {};
    const activeBreakSprites =
      this.tileDestructionFxSystem?.activeObjects?.size || 0;
    this.maximumResourceBreakSprites = Math.max(
      this.maximumResourceBreakSprites,
      activeBreakSprites,
    );
    document.body.dataset.resourceVisibleCount = String(
      this.resourceLayer?.getVisibleCount?.() || 0,
    );
    document.body.dataset.resourceTotalCount = String(
      this.resourceLayer?.images?.length || 0,
    );
    document.body.dataset.resourceCollapseCandidates = String(
      collapse.candidateCount || 0,
    );
    document.body.dataset.resourceCollapseScheduled = String(
      collapse.scheduledCount || 0,
    );
    document.body.dataset.resourceCollapsePlayed = String(
      collapse.playedCount || 0,
    );
    document.body.dataset.resourceBreakSprites = String(
      activeBreakSprites,
    );
    document.body.dataset.resourceBreakSpritePeak = String(
      this.maximumResourceBreakSprites,
    );
  }

  _destroyViews() {
    this.keyboardCapture?.removeEventListener(
      "input",
      this.captureInputHandler,
    );
    this.keyboardCapture?.removeEventListener(
      "keydown",
      this.captureKeyHandler,
    );
    this.modal?.destroy();
    this.resourcePresentationSystem?.destroy();
    this.tileDestructionFxSystem?.destroy();
    this.resourceLayer?.destroy();
    this.holdView?.destroy();
    this.scarView?.destroy();
    this.system?.destroy();
    this.worldMapStarTerritorySystem?.destroy();
    this.keyboardCapture = null;
    this.captureInputHandler = null;
    this.captureKeyHandler = null;
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: 0x02040a,
  parent: document.body,
  render: { antialias: true, antialiasGL: true, roundPixels: false },
  scene: [StarConsumptionConfirmationHarness],
});

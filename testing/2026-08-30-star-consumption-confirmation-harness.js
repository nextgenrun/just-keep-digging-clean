import { HARDCORE_MODE_CONFIG } from "../values/hardcoreMode.js";
import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from
  "../values/starIdentityLibrary.js";
import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { StarSanctuarySystem } from
  "../systems/environment/StarSanctuarySystem.js";
import { installStarIdentityTextureFrames } from
  "../systems/visual/installStarIdentityTextureFrames.js";
import { StarConsumptionHoldView } from
  "../systems/visual/StarConsumptionHoldView.js";
import { StarlessScarView } from "../systems/visual/StarlessScarView.js";
import { HardcoreModalOverlay } from
  "../ui/overlays/HardcoreModalOverlay.js";

const WIDTH = 1280;
const HEIGHT = 720;
const TILE_SIZE = 64;
const STAR = Object.freeze({ tx: 9, ty: 4 });
const IDENTITY_INDEX = 37;
const RARITY_INDEX = 3;
const assetPath = path => `../${path}`;

class HarnessWorld {
  constructor() {
    this.widthTiles = WIDTH / TILE_SIZE;
    this.depthTiles = HEIGHT / TILE_SIZE;
    this.tileSize = TILE_SIZE;
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
    return TILE_TYPES.DIRT;
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
  }

  preload() {
    const assets = [
      WORLD_VISUAL_MATERIALS.shallowBlue,
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
    this._drawStar();
    this._drawInstructions();
    this.system = new StarSanctuarySystem(
      this.worldModel,
      STAR_SANCTUARY_CONFIG,
      { enabled: true, consumptionAcknowledged: false },
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
    this.modal = new HardcoreModalOverlay(this, HARDCORE_MODE_CONFIG);
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
    const copy = STAR_SANCTUARY_CONFIG.consumption.acknowledgement;
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

  update(time, delta) {
    if (!this.system || this.modal?.isVisible || this.holdComplete) {
      this.scarView?.update();
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
    document.body.dataset.holdProgress = String(
      Math.round((snapshot.pendingConsumption?.progress || 0) * 100),
    );
    document.body.dataset.previewVisible = String(
      this.scarView.getSnapshot().previewVisible,
    );
  }

  _consumeStar() {
    this.worldModel.consumed = true;
    this.holdComplete = true;
    this.starObjects.forEach(object => object.setVisible(false));
    this.holdView.update(null);
    this.hint.setText("STAR CONSUMED • THE 4-TILE SCAR IS PERMANENT");
    document.body.dataset.holdConfirmed = "true";
    document.body.dataset.stage = "consumed";
  }

  _destroyViews() {
    this.modal?.destroy();
    this.holdView?.destroy();
    this.scarView?.destroy();
    this.system?.destroy();
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

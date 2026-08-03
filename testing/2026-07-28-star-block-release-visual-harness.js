import { FloatingTextSystem } from "../systems/visual/FloatingTextSystem.js";
import {
  getStarBlockPulsePreloadAssets,
} from "../values/lightConfig.js";
import {
  STAR_CONSTELLATION_CONFIG,
  getCollectedStarReleasePreloadAssets,
} from "../values/starConstellations.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../values/starRarityProgression.js";
import { getSignProgress } from "../values/starRarityProgressionMath.js";
import { WORLD_VISUAL_SEMANTIC_ASSETS } from "../values/worldVisualSemanticAssets.js";

const RELEASE_FX = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx;
const SKY_TILE = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile;
const REVIEW_RARITY = Math.max(
  0,
  Math.min(
    STAR_RARITY_PROGRESSION_CONFIG.rarityTiers.length - 1,
    Math.floor(Number(new URLSearchParams(location.search).get("rarity")) || 2),
  ),
);
const HARNESS = Object.freeze({
  width: 1280,
  height: 720,
  backgroundColor: 0x02050b,
  startX: 640,
  startY: 628,
  referenceX: 154,
  referenceY: 560,
  rarity: REVIEW_RARITY,
  fontFamily: "Consolas, monospace",
});

const rootAssetPath = (path) => `../${path}`;

class StarBlockReleaseVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("StarBlockReleaseVisualHarnessScene");
    this.floatingTextSystem = null;
    this.sourceBlock = null;
    this.sourceIcon = null;
    this.releaseActive = false;
  }

  preload() {
    const beautyAtlas = SKY_TILE.beautyAtlas;
    this.load.spritesheet(
      beautyAtlas.key,
      rootAssetPath(beautyAtlas.path),
      {
        frameWidth: beautyAtlas.frameSizePx,
        frameHeight: beautyAtlas.frameSizePx,
      }
    );
    for (const asset of [
      ...getCollectedStarReleasePreloadAssets(),
      ...getStarBlockPulsePreloadAssets(),
    ]) {
      this.load.image(asset.key, rootAssetPath(asset.path));
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(HARNESS.backgroundColor);
    this._drawBackdrop();
    this._drawRarityFamily();
    this._drawReferenceIcon();
    this._drawReleaseOrigin();

    this.floatingTextSystem = new FloatingTextSystem(this, 99);
    this.input.keyboard.on("keydown-SPACE", () => this._playRelease());
    this.input.on("pointerdown", () => this._playRelease());

    document.body.dataset.starReleaseHarnessReady = "true";
    document.body.dataset.releasePhase = "idle";
    document.body.dataset.tileDisplaySizePx = `${RELEASE_FX.tileDisplaySizePx}`;
    document.body.dataset.startScale = `${RELEASE_FX.startScale}`;
    document.body.dataset.popScale = `${RELEASE_FX.flashScale}`;
    document.body.dataset.growthDelayMs = `${RELEASE_FX.growthDelayMs}`;
    document.body.dataset.peakScale = `${RELEASE_FX.peakScale}`;
    document.body.dataset.echoCount = `${RELEASE_FX.echoCount}`;
    document.body.dataset.durationMs = `${RELEASE_FX.durationMs}`;
  }

  _drawBackdrop() {
    const graphics = this.add.graphics().setDepth(-10);
    graphics.fillStyle(0x06101d, 1).fillRect(0, 0, HARNESS.width, HARNESS.height);
    graphics.fillStyle(0x0b1b2a, 1).fillRect(0, 430, HARNESS.width, 290);
    graphics.lineStyle(1, 0x17334c, 0.55);
    for (let x = 0; x <= HARNESS.width; x += 94) {
      graphics.lineBetween(x, 430, x, HARNESS.height);
    }
    for (let y = 438; y <= HARNESS.height; y += 94) {
      graphics.lineBetween(0, y, HARNESS.width, y);
    }

    this.add.text(42, 28, "STAR BLOCK • RARITY + SIGN XP PRODUCTION RELEASE", {
      color: "#eaf8ff",
      fontFamily: HARNESS.fontFamily,
      fontSize: "25px",
      fontStyle: "bold",
    });
    this.add.text(
      42,
      66,
      `Same core • ${Math.round(RELEASE_FX.tileDisplaySizePx * RELEASE_FX.flashScale)} px 1:1 pop`
        + ` • ${Math.round(RELEASE_FX.tileDisplaySizePx * RELEASE_FX.peakScale)} px peak`
        + ` • ${(RELEASE_FX.durationMs / 1000).toFixed(1)}s+ rise • six echoes`,
      {
        color: "#7fccec",
        fontFamily: HARNESS.fontFamily,
        fontSize: "17px",
      }
    );
    this.add.text(640, 405, "CLICK OR PRESS SPACE • ?rarity=0..5 SELECTS THE PALETTE", {
      color: "#b6eaff",
      fontFamily: HARNESS.fontFamily,
      fontSize: "15px",
    }).setOrigin(0.5);
  }

  _drawRarityFamily() {
    const labels = ["CYAN", "LAVENDER", "GOLD", "ORANGE", "TURQUOISE", "VIOLET"];
    const startX = 390;
    labels.forEach((label, index) => {
      const x = startX + index * 102;
      this.add.image(x, 180, SKY_TILE.beautyAtlas.key, index)
        .setDisplaySize(68, 68)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      this.add.text(x, 232, label, {
        color: "#819ab0",
        fontFamily: HARNESS.fontFamily,
        fontSize: "11px",
      }).setOrigin(0.5);
    });
  }

  _drawReferenceIcon() {
    const tileSize = RELEASE_FX.tileDisplaySizePx;
    this.add.rectangle(
      HARNESS.referenceX,
      HARNESS.referenceY,
      tileSize,
      tileSize,
      0x0b1824,
      0.92
    ).setStrokeStyle(2, 0x4d7790, 0.8);
    this.add.image(
      HARNESS.referenceX,
      HARNESS.referenceY,
      SKY_TILE.beautyAtlas.key,
      HARNESS.rarity
    )
      .setDisplaySize(tileSize, tileSize)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.add.text(HARNESS.referenceX, HARNESS.referenceY - 76, "LIVE BLOCK ICON", {
      color: "#d5f4ff",
      fontFamily: HARNESS.fontFamily,
      fontSize: "15px",
    }).setOrigin(0.5);
    this.add.text(HARNESS.referenceX, HARNESS.referenceY + 72, "94 × 94 px", {
      color: "#77bdd9",
      fontFamily: HARNESS.fontFamily,
      fontSize: "14px",
    }).setOrigin(0.5);
  }

  _drawReleaseOrigin() {
    const tileSize = RELEASE_FX.tileDisplaySizePx;
    this.sourceBlock = this.add.rectangle(
      HARNESS.startX,
      HARNESS.startY,
      tileSize,
      tileSize,
      0x0b1824,
      0.92
    ).setStrokeStyle(2, 0x4d7790, 0.8);
    this.sourceIcon = this.add.image(
      HARNESS.startX,
      HARNESS.startY,
      SKY_TILE.beautyAtlas.key,
      HARNESS.rarity
    )
      .setDisplaySize(tileSize, tileSize)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.add.text(HARNESS.startX, HARNESS.startY - 74, "DESTRUCTION ORIGIN", {
      color: "#d5f4ff",
      fontFamily: HARNESS.fontFamily,
      fontSize: "15px",
    }).setOrigin(0.5);
  }

  _playRelease() {
    if (this.releaseActive) return;
    this.releaseActive = true;
    this.sourceBlock.setVisible(false);
    this.sourceIcon.setVisible(false);
    document.body.dataset.releasePhase = "pop";

    const tier = STAR_RARITY_PROGRESSION_CONFIG.rarityTiers[HARNESS.rarity];
    const signProgress = getSignProgress("dirt", tier.signXp);
    this.floatingTextSystem.showCollectedSkyStarRelease(
      HARNESS.rarity,
      HARNESS.startX,
      HARNESS.startY,
      "dirt",
      {
        ...signProgress,
        resourceType: "dirt",
        constellationName: STAR_CONSTELLATION_CONFIG.defs.dirt.name,
        count: 1,
        threshold: signProgress.totalXp,
        xpBefore: 0,
        xpGained: tier.signXp,
        levelBefore: 0,
        levelProgressBefore: 0,
        levelsGained: signProgress.level,
        rarity: HARNESS.rarity,
        rarityId: tier.id,
      },
    );

    this.time.delayedCall(1500, () => {
      document.body.dataset.releasePhase = "growing";
    });
    this.time.delayedCall(4300, () => {
      document.body.dataset.releasePhase = "floating";
    });
    this.time.delayedCall(
      RELEASE_FX.durationMs + RELEASE_FX.liftDelayMs + 400,
      () => {
        this.releaseActive = false;
        this.sourceBlock.setVisible(true);
        this.sourceIcon.setVisible(true);
        document.body.dataset.releasePhase = "idle";
      }
    );
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: HARNESS.width,
  height: HARNESS.height,
  backgroundColor: HARNESS.backgroundColor,
  parent: document.body,
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
  },
  scene: [StarBlockReleaseVisualHarnessScene],
});

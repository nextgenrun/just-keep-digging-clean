import {
  WORLD_VISUAL_DAMAGE,
  resolveWorldVisualDamageStateNumber,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { WorldVisualDamagePainter } from "../world/rendering/scenic-world/WorldVisualDamagePainter.js";

const HARNESS = Object.freeze({
  width: 1216,
  height: 672,
  tileSize: 64,
  firstTileX: 4,
  firstTileY: 1,
  stateColumns: WORLD_VISUAL_DAMAGE.stateCount + 1,
  labelX: 20,
  labelWidth: 220,
  headerY: 13,
  groundDepth: 1,
  feedbackDepth: 2.45,
  backgroundColor: 0x07090d,
  headerColor: "#f0dfbf",
  labelColor: "#b7c5d6",
  mutedColor: "#6d7785",
  fontFamily: "Consolas, monospace",
  headerFontSize: "16px",
  labelFontSize: "14px",
});

class GroundDamageVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("GroundDamageVisualHarnessScene");
    this.damagePainter = null;
    this.damageMaskSource = null;
    this.damageMask = null;
  }

  preload() {
    for (const asset of Object.values(WORLD_VISUAL_MATERIALS)) {
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    const materialEntries = Object.entries(WORLD_VISUAL_MATERIALS);
    const rowWidth = HARNESS.stateColumns * HARNESS.tileSize;
    const startX = HARNESS.firstTileX * HARNESS.tileSize;
    this.cameras.main.setBackgroundColor(HARNESS.backgroundColor);
    this._drawHeader(startX);

    for (const [rowIndex, [materialId, material]] of materialEntries.entries()) {
      const tileY = HARNESS.firstTileY + rowIndex;
      const y = tileY * HARNESS.tileSize;
      this.add.tileSprite(startX, y, rowWidth, HARNESS.tileSize, material.key)
        .setOrigin(0)
        .setDepth(HARNESS.groundDepth);
      this.add.text(HARNESS.labelX, y + HARNESS.tileSize * 0.5, materialId, {
        color: HARNESS.labelColor,
        fontFamily: HARNESS.fontFamily,
        fontSize: HARNESS.labelFontSize,
        fixedWidth: HARNESS.labelWidth,
      }).setOrigin(0, 0.5).setDepth(HARNESS.feedbackDepth);
    }

    this.damageMaskSource = this.make.graphics({ add: false });
    this.damageMaskSource.fillStyle(0xffffff, 1).fillRect(
      startX,
      HARNESS.firstTileY * HARNESS.tileSize,
      rowWidth,
      materialEntries.length * HARNESS.tileSize
    );
    this.damageMask = this.damageMaskSource.createGeometryMask();
    this.damagePainter = new WorldVisualDamagePainter(
      this,
      this.damageMask,
      HARNESS.feedbackDepth,
      WORLD_VISUAL_DAMAGE
    );
    this.damagePainter.create();

    for (const [rowIndex] of materialEntries.entries()) {
      const tileY = HARNESS.firstTileY + rowIndex;
      WORLD_VISUAL_DAMAGE.stages.forEach((stage, stageIndex) => {
        this.damagePainter.draw(
          HARNESS.firstTileX + stageIndex + 1,
          tileY,
          stageIndex === WORLD_VISUAL_DAMAGE.stages.length - 1 ? 1 : stage.minDamage,
          HARNESS.tileSize,
          HARNESS.firstTileX,
          tileY
        );
      });
    }

    globalThis.__GROUND_DAMAGE_HARNESS__ = Object.freeze({
      ready: true,
      materialCount: materialEntries.length,
      stateCount: WORLD_VISUAL_DAMAGE.stateCount,
      layerCount: 4,
      lastState: resolveWorldVisualDamageStateNumber(1),
    });
    document.body.dataset.damageHarnessReady = "true";
    document.body.dataset.materialCount = `${materialEntries.length}`;
    document.body.dataset.stateCount = `${WORLD_VISUAL_DAMAGE.stateCount}`;
    document.body.dataset.layerCount = "4";
  }

  _drawHeader(startX) {
    this.add.text(HARNESS.labelX, HARNESS.headerY, "DAMAGE PROGRESSION", {
      color: HARNESS.headerColor,
      fontFamily: HARNESS.fontFamily,
      fontSize: HARNESS.headerFontSize,
    });
    for (let state = 0; state < HARNESS.stateColumns; state += 1) {
      this.add.text(
        startX + (state + 0.5) * HARNESS.tileSize,
        HARNESS.headerY,
        state === 0 ? "INTACT" : `${state}`,
        {
          color: state === 0 ? HARNESS.mutedColor : HARNESS.headerColor,
          fontFamily: HARNESS.fontFamily,
          fontSize: HARNESS.labelFontSize,
        }
      ).setOrigin(0.5, 0);
    }
  }

  shutdown() {
    this.damagePainter?.destroy();
    this.damageMask?.destroy();
    this.damageMaskSource?.destroy();
    this.damagePainter = null;
    this.damageMask = null;
    this.damageMaskSource = null;
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
    roundPixels: false,
  },
  scene: [GroundDamageVisualHarnessScene],
});

import { WORLD_VISUAL_DAMAGE_IMAGE_REVIEW } from "../values/worldVisualDamageImageReview.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";

const REVIEW = WORLD_VISUAL_DAMAGE_IMAGE_REVIEW;
const HARNESS = REVIEW.harness;
const ATLAS = REVIEW.atlas;

class ImageGenGroundDamageReviewScene extends Phaser.Scene {
  constructor() {
    super("ImageGenGroundDamageReviewScene");
  }

  preload() {
    this.load.image(ATLAS.key, `../${ATLAS.path}`);
    for (const asset of Object.values(WORLD_VISUAL_MATERIALS)) {
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    const materialEntries = Object.entries(WORLD_VISUAL_MATERIALS);
    const stateColumns = ATLAS.stateCount + 1;
    const rowWidth = stateColumns * HARNESS.tileSize;
    const startX = HARNESS.firstTileX * HARNESS.tileSize;
    this.cameras.main.setBackgroundColor(HARNESS.backgroundColor);
    this._registerAtlasFrames();
    this._drawHeader(startX, stateColumns);

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
      }).setOrigin(0, 0.5).setDepth(HARNESS.damageDepth);

      for (let state = 1; state <= ATLAS.stateCount; state += 1) {
        this.add.image(
          startX + (state + 0.5) * HARNESS.tileSize,
          y + HARNESS.tileSize * 0.5,
          ATLAS.key,
          `${ATLAS.framePrefix}${state}`
        ).setDisplaySize(HARNESS.tileSize, HARNESS.tileSize)
          .setDepth(HARNESS.damageDepth);
      }
    }

    globalThis.__IMAGEGEN_GROUND_DAMAGE_REVIEW__ = Object.freeze({
      ready: true,
      reviewOnly: REVIEW.reviewOnly,
      productionChanged: REVIEW.productionChanged,
      materialCount: materialEntries.length,
      stateCount: ATLAS.stateCount,
    });
    document.body.dataset.imagegenDamageReady = "true";
    document.body.dataset.materialCount = `${materialEntries.length}`;
    document.body.dataset.stateCount = `${ATLAS.stateCount}`;
    document.body.dataset.productionChanged = `${REVIEW.productionChanged}`;
  }

  _registerAtlasFrames() {
    const texture = this.textures.get(ATLAS.key);
    for (let state = 0; state < ATLAS.stateCount; state += 1) {
      const column = state % ATLAS.columns;
      const row = Math.floor(state / ATLAS.columns);
      const x = column * ATLAS.columnStride
        + Math.floor((ATLAS.columnStride - ATLAS.frameSize) * 0.5);
      texture.add(
        `${ATLAS.framePrefix}${state + 1}`,
        0,
        x,
        ATLAS.rowOffsets[row],
        ATLAS.frameSize,
        ATLAS.frameSize
      );
    }
  }

  _drawHeader(startX, stateColumns) {
    this.add.text(HARNESS.labelX, HARNESS.headerY, "IMAGEGEN DAMAGE ART", {
      color: HARNESS.headerColor,
      fontFamily: HARNESS.fontFamily,
      fontSize: HARNESS.headerFontSize,
    });
    for (let state = 0; state < stateColumns; state += 1) {
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
  scene: [ImageGenGroundDamageReviewScene],
});

import {
  WORLD_VISUAL_DAMAGE,
  WORLD_VISUAL_DAMAGE_MODES,
  resolveWorldVisualDamageMode,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_DAMAGE_RUNTIME_REVIEW } from
  "../values/worldVisualDamageRuntimeReview.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";

const REVIEW = WORLD_VISUAL_DAMAGE_RUNTIME_REVIEW;
const DAMAGE = WORLD_VISUAL_DAMAGE;

function findVariationCoordinate(targetVariant, y) {
  for (let x = 0; x < 10_000; x += 1) {
    if (resolveWorldVisualDamageVariant(x, y) === targetVariant) return { x, y };
  }
  throw new Error(`Unable to find coordinate for damage variant ${targetVariant}`);
}

class ImageGenGroundDamageRuntimeScene extends Phaser.Scene {
  constructor() {
    super("ImageGenGroundDamageRuntimeScene");
    this.damagePainter = null;
  }

  preload() {
    this.load.image(DAMAGE.imagegen.atlas.key, `../${DAMAGE.imagegen.atlas.path}`);
    for (const asset of Object.values(WORLD_VISUAL_MATERIALS)) {
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor);
    this.damagePainter = new WorldVisualDamageImagePainter(
      this,
      null,
      REVIEW.damageDepth
    );
    this.damagePainter.create();
    this._drawHeader();

    const materialEntries = Object.entries(WORLD_VISUAL_MATERIALS);
    const rowWidth = REVIEW.stateColumns * REVIEW.tileSize;
    const startX = REVIEW.firstTileX * REVIEW.tileSize;
    for (const [rowIndex, [materialId, material]] of materialEntries.entries()) {
      const tileY = REVIEW.firstTileY + rowIndex;
      const y = tileY * REVIEW.tileSize;
      const variation = findVariationCoordinate(rowIndex, 100 + rowIndex);
      this.add.tileSprite(startX, y, rowWidth, REVIEW.tileSize, material.key)
        .setOrigin(0)
        .setDepth(REVIEW.groundDepth);
      this.add.text(REVIEW.labelX, y + REVIEW.tileSize * 0.5, materialId, {
        color: REVIEW.labelColor,
        fontFamily: REVIEW.fontFamily,
        fontSize: REVIEW.labelFontSize,
      }).setOrigin(0, 0.5).setDepth(REVIEW.damageDepth);

      for (let stateIndex = 0; stateIndex < DAMAGE.stateCount; stateIndex += 1) {
        const drawTileX = REVIEW.firstTileX + stateIndex + 1;
        this.damagePainter.draw(
          drawTileX,
          tileY,
          DAMAGE.stages[stateIndex].minDamage,
          REVIEW.tileSize,
          variation.x,
          variation.y
        );
      }
    }

    globalThis.__IMAGEGEN_GROUND_DAMAGE_RUNTIME__ = Object.freeze({
      ready: true,
      reviewOnly: REVIEW.reviewOnly,
      productionChanged: REVIEW.productionChanged,
      defaultMode: resolveWorldVisualDamageMode(),
      expectedDefaultMode: WORLD_VISUAL_DAMAGE_MODES.imagegen,
      materialCount: materialEntries.length,
      variants: DAMAGE.imagegen.variants,
      stateCount: DAMAGE.stateCount,
      frameCount: DAMAGE.imagegen.atlas.frameCount,
      pooledImageCount: this.damagePainter.pool.length,
      visibleDamageGraphics: 0,
    });
    document.body.dataset.imagegenDamageRuntimeReady = "true";
    document.body.dataset.defaultMode = resolveWorldVisualDamageMode();
    document.body.dataset.frameCount = `${DAMAGE.imagegen.atlas.frameCount}`;
    document.body.dataset.visibleDamageGraphics = "0";
  }

  _drawHeader() {
    const startX = REVIEW.firstTileX * REVIEW.tileSize;
    this.add.text(REVIEW.labelX, REVIEW.headerY, "IMAGEGEN DAMAGE · PRODUCTION ATLAS", {
      color: REVIEW.headerColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.titleFontSize,
    });
    for (let state = 0; state < REVIEW.stateColumns; state += 1) {
      this.add.text(
        startX + (state + 0.5) * REVIEW.tileSize,
        REVIEW.headerY + REVIEW.tileSize * 0.42,
        state === 0 ? "INTACT" : `${state}`,
        {
          color: state === 0 ? REVIEW.mutedColor : REVIEW.headerColor,
          fontFamily: REVIEW.fontFamily,
          fontSize: REVIEW.stateFontSize,
        }
      ).setOrigin(0.5, 0);
    }
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: REVIEW.width,
  height: REVIEW.height,
  backgroundColor: REVIEW.backgroundColor,
  parent: document.body,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [ImageGenGroundDamageRuntimeScene],
});

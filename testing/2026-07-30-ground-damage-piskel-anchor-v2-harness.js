import {
  WORLD_VISUAL_DAMAGE,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_DAMAGE_RUNTIME_REVIEW } from
  "../values/worldVisualDamageRuntimeReview.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";

const REVIEW = WORLD_VISUAL_DAMAGE_RUNTIME_REVIEW;
const CANDIDATE_ATLAS = Object.freeze({
  ...WORLD_VISUAL_DAMAGE.imagegen.atlas,
  key: "world-visual-ground-damage-piskel-anchor-v2-review",
  path: "exports/piskel/ground-damage-anchor-v2-review/ground-damage-anchor-v2-candidate-atlas.png",
});
const CANDIDATE_DAMAGE = Object.freeze({
  ...WORLD_VISUAL_DAMAGE,
  imagegen: Object.freeze({
    ...WORLD_VISUAL_DAMAGE.imagegen,
    atlas: CANDIDATE_ATLAS,
  }),
});

function findVariationCoordinate(targetVariant, y) {
  for (let x = 0; x < 10_000; x += 1) {
    if (resolveWorldVisualDamageVariant(x, y, CANDIDATE_DAMAGE) === targetVariant) {
      return { x, y };
    }
  }
  throw new Error(`Unable to find coordinate for damage variant ${targetVariant}`);
}

class GroundDamagePiskelAnchorReviewScene extends Phaser.Scene {
  constructor() {
    super("GroundDamagePiskelAnchorReviewScene");
    this.damagePainter = null;
  }

  preload() {
    this.load.image(CANDIDATE_ATLAS.key, `../${CANDIDATE_ATLAS.path}`);
    for (const asset of Object.values(WORLD_VISUAL_MATERIALS)) {
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor);
    this.damagePainter = new WorldVisualDamageImagePainter(
      this,
      null,
      REVIEW.damageDepth,
      CANDIDATE_DAMAGE
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

      for (let stateIndex = 0; stateIndex < CANDIDATE_DAMAGE.stateCount; stateIndex += 1) {
        this.damagePainter.draw(
          REVIEW.firstTileX + stateIndex + 1,
          tileY,
          CANDIDATE_DAMAGE.stages[stateIndex].minDamage,
          REVIEW.tileSize,
          variation.x,
          variation.y
        );
      }
    }

    globalThis.__GROUND_DAMAGE_PISKEL_ANCHOR_V2__ = Object.freeze({
      ready: true,
      reviewOnly: true,
      productionChanged: false,
      materialCount: materialEntries.length,
      variants: CANDIDATE_DAMAGE.imagegen.variants,
      stateCount: CANDIDATE_DAMAGE.stateCount,
      frameCount: CANDIDATE_ATLAS.frameCount,
      pooledImageCount: this.damagePainter.pool.length,
      painterClass: this.damagePainter.constructor.name,
      placementContract: "WorldVisualDamageImagePainter.draw",
    });
    document.body.dataset.groundDamagePiskelAnchorReady = "true";
    document.body.dataset.productionChanged = "false";
    document.body.dataset.frameCount = `${CANDIDATE_ATLAS.frameCount}`;
  }

  _drawHeader() {
    const startX = REVIEW.firstTileX * REVIEW.tileSize;
    this.add.text(REVIEW.labelX, REVIEW.headerY, "PISKEL ANCHOR V2 · REVIEW CANDIDATE", {
      color: REVIEW.headerColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.titleFontSize,
    });
    this.add.text(REVIEW.labelX, REVIEW.headerY + 30, "Exact production painter · no runtime wiring", {
      color: REVIEW.mutedColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.stateFontSize,
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
  scene: [GroundDamagePiskelAnchorReviewScene],
});

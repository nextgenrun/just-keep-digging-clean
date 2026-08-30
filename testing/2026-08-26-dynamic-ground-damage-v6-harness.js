import {
  WORLD_VISUAL_DAMAGE,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageResponseVariant,
  resolveWorldVisualDamageTransform,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_DAMAGE_DYNAMIC_REVIEW as REVIEW } from
  "../values/worldVisualDamageDynamicReview.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { resolveTileDestructionResponseProfile } from "../values/tileDestructionFx.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";


function installForegroundFrame(scene, index) {
  const atlas = REVIEW.foregroundAtlas;
  const texture = scene.textures.get(atlas.key);
  const name = `${REVIEW.foregroundFramePrefix}${index}`;
  if (texture.has(name)) return;
  texture.add(
    name,
    0,
    (index % REVIEW.foregroundColumns) * REVIEW.foregroundFrameWidth,
    Math.floor(index / REVIEW.foregroundColumns) * REVIEW.foregroundFrameHeight,
    REVIEW.foregroundFrameWidth,
    REVIEW.foregroundFrameHeight,
  );
}

function findStoneResponseCoordinates() {
  const profile = resolveTileDestructionResponseProfile(TILE_TYPES.STONE);
  const found = Array(REVIEW.responseVariantCount).fill(null);
  const radius = REVIEW.coordinateSearchRadius;
  for (let ty = -radius; ty <= radius && found.some(value => value === null); ty += 1) {
    for (let tx = -radius; tx <= radius; tx += 1) {
      if (resolveWorldVisualDamageVariant(tx, ty) !== REVIEW.targetStructuralVariant) continue;
      if (resolveWorldVisualDamageTransform(tx, ty).index !== REVIEW.targetTransformIndex) continue;
      const variant = resolveWorldVisualDamageResponseVariant(tx, ty, profile);
      if (found[variant] === null) found[variant] = Object.freeze({ tx, ty, variant });
    }
  }
  if (found.some(value => value === null)) {
    throw new Error("Unable to find stable coordinates for all Stone response variants");
  }
  return Object.freeze(found);
}

class DynamicGroundDamageV6Scene extends Phaser.Scene {
  constructor() {
    super("DynamicGroundDamageV6Scene");
    this.damagePainter = null;
  }

  preload() {
    const material = WORLD_VISUAL_MATERIALS[REVIEW.groundMaterial];
    const assets = [
      ...getWorldVisualDamagePreloadAssets(),
      REVIEW.foregroundAtlas,
      material,
    ];
    const queued = new Set();
    for (const asset of assets) {
      if (!asset || queued.has(asset.key)) continue;
      queued.add(asset.key);
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    const atlas = resolveWorldVisualDamageAtlas();
    const coordinates = findStoneResponseCoordinates();
    const material = WORLD_VISUAL_MATERIALS[REVIEW.groundMaterial];
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor);
    const maskGraphics = this.make.graphics({ add: false });
    maskGraphics.fillStyle(0xffffff, 1);
    for (let row = 0; row < REVIEW.rows; row += 1) {
      const centerY = REVIEW.firstRowY + row * REVIEW.rowPitch;
      installForegroundFrame(this, REVIEW.foregroundFrames[row]);
      for (let column = 0; column < REVIEW.columns; column += 1) {
        const centerX = REVIEW.firstColumnX + column * REVIEW.columnPitch;
        maskGraphics.fillRect(
          centerX - REVIEW.tileSize / 2,
          centerY - REVIEW.tileSize / 2,
          REVIEW.tileSize,
          REVIEW.tileSize,
        );
      }
    }
    const geometryMask = maskGraphics.createGeometryMask();
    this.damagePainter = new WorldVisualDamageImagePainter(
      this,
      geometryMask,
      REVIEW.damageDepth,
    );
    this.damagePainter.create();
    this._drawHeader();

    for (let row = 0; row < REVIEW.rows; row += 1) {
      const centerY = REVIEW.firstRowY + row * REVIEW.rowPitch;
      const state = REVIEW.damageStateIndexes[row];
      this.add.text(14, centerY, `TIER ${row + 1}\nSTATE ${state + 1}`, {
        color: REVIEW.labelColor,
        fontFamily: REVIEW.fontFamily,
        fontSize: REVIEW.labelFontSize,
        align: "left",
      }).setOrigin(0, 0.5).setDepth(REVIEW.damageDepth + 0.02);

      for (let column = 0; column < REVIEW.columns; column += 1) {
        const centerX = REVIEW.firstColumnX + column * REVIEW.columnPitch;
        this.add.tileSprite(
          centerX,
          centerY,
          REVIEW.tileSize,
          REVIEW.tileSize,
          material.key,
        ).setDepth(REVIEW.groundDepth);
        this.add.image(
          centerX,
          centerY,
          REVIEW.foregroundAtlas.key,
          `${REVIEW.foregroundFramePrefix}${REVIEW.foregroundFrames[row]}`,
        )
          .setDisplaySize(REVIEW.foregroundDisplayWidth, REVIEW.foregroundDisplayHeight)
          .setAlpha(REVIEW.foregroundAlpha)
          .setDepth(REVIEW.foregroundDepth)
          .setMask(geometryMask);
        const variation = coordinates[column];
        this.damagePainter.draw(
          centerX / REVIEW.tileSize - 0.5,
          centerY / REVIEW.tileSize - 0.5,
          WORLD_VISUAL_DAMAGE.stages[state].minDamage,
          REVIEW.tileSize,
          variation.tx,
          variation.ty,
          TILE_TYPES[REVIEW.tileType],
        );
      }
    }

    const fixedSize = [
      ...this.damagePainter.pool,
      ...this.damagePainter.rimPool,
      ...this.damagePainter.responsePool,
    ].every(image => (
      Math.abs(image.displayWidth - REVIEW.tileSize) < 0.01
      && Math.abs(image.displayHeight - REVIEW.tileSize) < 0.01
    ));
    globalThis.__DYNAMIC_GROUND_DAMAGE_V6__ = Object.freeze({
      ready: true,
      selectedRevision: atlas.revision,
      stoneResponseVariants: coordinates.map(value => value.variant),
      responseCells: this.damagePainter.responsePool.length,
      fixedDisplaySize: fixedSize,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
    });
    document.body.dataset.dynamicGroundDamageV6Ready = "true";
    document.body.dataset.selectedRevision = atlas.revision;
    document.body.dataset.stoneResponseVariants = coordinates.map(value => value.variant).join(",");
    document.body.dataset.fixedDisplaySize = `${fixedSize}`;
    document.body.dataset.renderer = this.game.renderer.type === Phaser.WEBGL
      ? "webgl"
      : "canvas";
  }

  _drawHeader() {
    this.add.text(18, 14, REVIEW.title, {
      color: REVIEW.headerColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.titleFontSize,
    }).setDepth(REVIEW.damageDepth + 0.02);
    this.add.text(18, 46, REVIEW.subtitle, {
      color: REVIEW.mutedColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.stateFontSize,
    }).setDepth(REVIEW.damageDepth + 0.02);
    this.add.text(
      18,
      66,
      "10 DETERMINISTIC LAYOUTS x 8 SAFE TRANSFORMS = 80 STABLE STONE RESPONSES",
      {
        color: REVIEW.familyColor,
        fontFamily: REVIEW.fontFamily,
        fontSize: REVIEW.stateFontSize,
      },
    ).setDepth(REVIEW.damageDepth + 0.02);
    for (let column = 0; column < REVIEW.columns; column += 1) {
      this.add.text(
        REVIEW.firstColumnX + column * REVIEW.columnPitch,
        REVIEW.firstRowY - REVIEW.tileSize / 2 - 17,
        `V${String(column + 1).padStart(2, "0")}`,
        {
          color: REVIEW.mutedColor,
          fontFamily: REVIEW.fontFamily,
          fontSize: REVIEW.stateFontSize,
        },
      ).setOrigin(0.5).setDepth(REVIEW.damageDepth + 0.02);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: REVIEW.width,
  height: REVIEW.height,
  backgroundColor: REVIEW.backgroundColor,
  parent: document.body,
  render: { antialias: true, roundPixels: false },
  scene: [DynamicGroundDamageV6Scene],
});

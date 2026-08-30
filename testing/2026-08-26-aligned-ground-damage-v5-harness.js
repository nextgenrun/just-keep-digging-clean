import {
  WORLD_VISUAL_DAMAGE,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageMixProfile,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_DAMAGE_ALIGNED_REVIEW as REVIEW } from
  "../values/worldVisualDamageAlignedReview.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";

const V5_SEARCH = "?groundDamageAtlas=v5";

function installForegroundFrame(scene, atlas, index) {
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

class AlignedGroundDamageV5Scene extends Phaser.Scene {
  constructor() {
    super("AlignedGroundDamageV5Scene");
    this.damagePainter = null;
  }

  preload() {
    const assets = [
      ...getWorldVisualDamagePreloadAssets(undefined, V5_SEARCH),
      ...REVIEW.profiles.map(profile => profile.atlas),
      ...REVIEW.profiles.map(profile => WORLD_VISUAL_MATERIALS[profile.material]),
    ];
    const queued = new Set();
    for (const asset of assets) {
      if (!asset || queued.has(asset.key)) continue;
      queued.add(asset.key);
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    const atlas = resolveWorldVisualDamageAtlas(undefined, V5_SEARCH);
    const mix = resolveWorldVisualDamageMixProfile(undefined, V5_SEARCH);
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor);
    const maskGraphics = this.make.graphics({ add: false });
    maskGraphics.fillStyle(0xffffff, 1);
    for (const [row, profile] of REVIEW.profiles.entries()) {
      installForegroundFrame(this, profile.atlas, profile.foregroundFrameIndex);
      const rowY = REVIEW.firstRowY + row * REVIEW.rowSpacing;
      for (let group = 0; group < REVIEW.patchCount; group += 1) {
        const patchX = REVIEW.panelX + group * (REVIEW.patchWidth + REVIEW.patchGap);
        maskGraphics.fillRect(
          patchX,
          rowY - REVIEW.patchHeight / 2,
          REVIEW.patchWidth,
          REVIEW.patchHeight,
        );
      }
    }
    const geometryMask = maskGraphics.createGeometryMask();
    this.damagePainter = new WorldVisualDamageImagePainter(
      this,
      geometryMask,
      REVIEW.damageDepth,
      WORLD_VISUAL_DAMAGE,
      V5_SEARCH,
    );
    this.damagePainter.create();
    this._drawHeader(atlas, mix);

    for (const [row, profile] of REVIEW.profiles.entries()) {
      const rowY = REVIEW.firstRowY + row * REVIEW.rowSpacing;
      this._drawRow(profile, row, rowY);
    }

    const fixedSize = [
      ...this.damagePainter.pool,
      ...this.damagePainter.rimPool,
      ...this.damagePainter.responsePool,
    ].every(image => (
      Math.abs(image.displayWidth - REVIEW.tileSize) < 0.01
      && Math.abs(image.displayHeight - REVIEW.tileSize) < 0.01
    ));
    globalThis.__ALIGNED_GROUND_DAMAGE_V5__ = Object.freeze({
      ready: true,
      selectedRevision: atlas.revision,
      logicalStates: WORLD_VISUAL_DAMAGE.stateCount,
      rasterTiers: atlas.rasterTiers,
      materialResponseTiers: mix.response.tiers,
      foregroundProfiles: REVIEW.profiles.length,
      foregroundFrames: REVIEW.profiles.length,
      damageCells: this.damagePainter.pool.length,
      fixedDisplaySize: fixedSize,
      logicalTilePx: REVIEW.tileSize,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
    });
    document.body.dataset.alignedGroundDamageV5Ready = "true";
    document.body.dataset.selectedRevision = atlas.revision;
    document.body.dataset.fixedDisplaySize = `${fixedSize}`;
    document.body.dataset.renderer = this.game.renderer.type === Phaser.WEBGL
      ? "webgl"
      : "canvas";
  }

  _drawHeader(atlas, mix) {
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
      `${atlas.variants} MOTIFS / ${atlas.rasterTiers} FRACTURE STATES / `
        + `${mix.response.tiers} MATERIAL STATES / ${atlas.transformCount} TRANSFORMS`,
      {
        color: REVIEW.familyColor,
        fontFamily: REVIEW.fontFamily,
        fontSize: REVIEW.stateFontSize,
      },
    ).setDepth(REVIEW.damageDepth + 0.02);
  }

  _drawRow(profile, row, rowY) {
    const material = WORLD_VISUAL_MATERIALS[profile.material];
    const tileType = TILE_TYPES[profile.tileType];
    this.add.text(16, rowY - 12, profile.label, {
      color: REVIEW.labelColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.labelFontSize,
      wordWrap: { width: REVIEW.panelX - 28 },
    }).setOrigin(0, 0.5).setDepth(REVIEW.damageDepth);

    for (let group = 0; group < REVIEW.patchCount; group += 1) {
      const patchX = REVIEW.panelX + group * (REVIEW.patchWidth + REVIEW.patchGap);
      this.add.tileSprite(
        patchX,
        rowY - REVIEW.patchHeight / 2,
        REVIEW.patchWidth,
        REVIEW.patchHeight,
        material.key,
      ).setOrigin(0).setDepth(REVIEW.groundDepth);
      this.add.image(
        patchX + REVIEW.patchWidth / 2,
        rowY,
        profile.atlas.key,
        `${REVIEW.foregroundFramePrefix}${profile.foregroundFrameIndex}`,
      )
        .setDisplaySize(REVIEW.patchWidth, REVIEW.patchHeight)
        .setAlpha(REVIEW.foregroundAlpha)
        .setDepth(REVIEW.foregroundDepth);

      for (let local = 0; local < 3; local += 1) {
        const state = group * 3 + local;
        const centerX = patchX + (local + 0.5) * REVIEW.tileSize;
        this.damagePainter.draw(
          centerX / REVIEW.tileSize - 0.5,
          rowY / REVIEW.tileSize - 0.5,
          WORLD_VISUAL_DAMAGE.stages[state].minDamage,
          REVIEW.tileSize,
          row * 101 + 31,
          row * 67 + 47,
          tileType,
        );
        this.add.text(centerX, rowY + REVIEW.patchHeight / 2 - 15, REVIEW.stateLabels[state], {
          color: REVIEW.mutedColor,
          fontFamily: REVIEW.fontFamily,
          fontSize: REVIEW.stateFontSize,
          backgroundColor: "rgba(7,9,13,0.72)",
          padding: { left: 3, right: 3, top: 1, bottom: 1 },
        }).setOrigin(0.5).setDepth(REVIEW.damageDepth + 0.01);
      }
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
  scene: [AlignedGroundDamageV5Scene],
});

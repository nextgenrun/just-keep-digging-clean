import {
  WORLD_VISUAL_DAMAGE,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_DAMAGE_LAYERED_REVIEW as REVIEW } from
  "../values/worldVisualDamageLayeredReview.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  WORLD_VISUAL_MATERIALS,
} from "../values/worldVisualMaterials.js";
import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  resolveWorldVisualSemanticResourceFrame,
  resolveWorldVisualSemanticSpecialFrame,
} from "../values/worldVisualSemanticAssets.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";


function installFrames(scene, atlas) {
  const texture = scene.textures.get(atlas.key);
  for (let index = 0; index < atlas.frameCount; index += 1) {
    const name = `${atlas.framePrefix}${index}`;
    if (texture.has(name)) continue;
    texture.add(
      name,
      0,
      (index % atlas.columns) * atlas.frameSizePx,
      Math.floor(index / atlas.columns) * atlas.frameSizePx,
      atlas.frameSizePx,
      atlas.frameSizePx,
    );
  }
}

class LayeredGroundDamageV3Scene extends Phaser.Scene {
  constructor() {
    super("LayeredGroundDamageV3Scene");
    this.damagePainter = null;
  }

  preload() {
    const semantic = WORLD_VISUAL_SEMANTIC_ASSETS;
    const assets = [
      ...getWorldVisualDamagePreloadAssets(),
      ...Object.values(WORLD_VISUAL_MATERIALS),
      semantic.resources.atlas,
      semantic.skyTile.beautyAtlas,
      semantic.specialBlocks.beautyAtlas,
    ];
    const keys = new Set();
    for (const asset of assets) {
      if (!asset || keys.has(asset.key)) continue;
      keys.add(asset.key);
      this.load.image(asset.key, `../${asset.path}`);
    }
  }

  create() {
    const atlas = resolveWorldVisualDamageAtlas();
    const semantic = WORLD_VISUAL_SEMANTIC_ASSETS;
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor);
    installFrames(this, semantic.resources.atlas);
    installFrames(this, semantic.skyTile.beautyAtlas);
    installFrames(this, semantic.specialBlocks.beautyAtlas);
    this.damagePainter = new WorldVisualDamageImagePainter(
      this,
      null,
      REVIEW.damageDepth,
    );
    this.damagePainter.create();
    this._drawHeaders(atlas.revision);

    for (const [familyIndex, profile] of REVIEW.families.entries()) {
      const panel = familyIndex < 9 ? 0 : 1;
      const row = panel === 0 ? familyIndex : familyIndex - 9;
      const panelX = REVIEW.panelX[panel];
      const y = REVIEW.firstRowY + (row + 0.5) * REVIEW.tileSize;
      const tileType = TILE_TYPES[profile.tileType];
      this.add.text(panelX, y, `${profile.family}\n${profile.tileType}`, {
        color: REVIEW.labelColor,
        fontFamily: REVIEW.fontFamily,
        fontSize: REVIEW.labelFontSize,
      }).setOrigin(0, 0.5).setDepth(REVIEW.damageDepth);

      for (const [column, stateIndex] of REVIEW.states.entries()) {
        const x = panelX + REVIEW.labelWidth + (column + 0.5) * REVIEW.tileSize;
        const material = WORLD_VISUAL_MATERIALS[profile.material];
        this.add.tileSprite(
          x - REVIEW.tileSize / 2,
          y - REVIEW.tileSize / 2,
          REVIEW.tileSize,
          REVIEW.tileSize,
          material.key,
        ).setOrigin(0).setDepth(REVIEW.groundDepth);
        this._showSemantic(profile, tileType, x, y, familyIndex);
        this.damagePainter.draw(
          x / REVIEW.tileSize - 0.5,
          y / REVIEW.tileSize - 0.5,
          WORLD_VISUAL_DAMAGE.stages[stateIndex].minDamage,
          REVIEW.tileSize,
          familyIndex * 17 + 11,
          familyIndex * 23 + 19,
          tileType,
        );
      }
    }

    globalThis.__LAYERED_GROUND_DAMAGE_V3__ = Object.freeze({
      ready: true,
      selectedRevision: atlas.revision,
      selectedAtlasPath: atlas.path,
      familyCount: REVIEW.families.length,
      stateCount: REVIEW.states.length,
      structuralPool: this.damagePainter.pool.length,
      rimPool: this.damagePainter.rimPool.length,
      responsePool: this.damagePainter.responsePool.length,
      logicalTilePx: REVIEW.tileSize,
      productionPainter: REVIEW.productionPainter,
    });
    document.body.dataset.layeredGroundDamageV3Ready = "true";
    document.body.dataset.selectedRevision = atlas.revision;
  }

  _showSemantic(profile, tileType, x, y, variation) {
    const semantic = WORLD_VISUAL_SEMANTIC_ASSETS;
    let atlas = null;
    let frameIndex = null;
    let blendMode = Phaser.BlendModes.NORMAL;
    if (profile.resource) {
      atlas = semantic.resources.atlas;
      frameIndex = resolveWorldVisualSemanticResourceFrame(
        variation * 13 + 7,
        variation * 19 + 5,
        profile.resource,
      );
    } else if (profile.semantic === "star") {
      atlas = semantic.skyTile.beautyAtlas;
      frameIndex = variation % atlas.frameCount;
      blendMode = Phaser.BlendModes.SCREEN;
    } else if (profile.semantic === "special") {
      atlas = semantic.specialBlocks.beautyAtlas;
      frameIndex = resolveWorldVisualSemanticSpecialFrame(tileType, 1800);
    }
    if (!atlas || !Number.isInteger(frameIndex)) return;
    this.add.image(x, y, atlas.key, `${atlas.framePrefix}${frameIndex}`)
      .setDisplaySize(REVIEW.tileSize, REVIEW.tileSize)
      .setBlendMode(blendMode)
      .setDepth(REVIEW.semanticDepth);
  }

  _drawHeaders(revision) {
    this.add.text(14, 12, `${REVIEW.title} - ${revision.toUpperCase()}`, {
      color: REVIEW.headerColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.titleFontSize,
    });
    for (const panelX of REVIEW.panelX) {
      for (const [column, label] of REVIEW.stateLabels.entries()) {
        this.add.text(
          panelX + REVIEW.labelWidth + (column + 0.5) * REVIEW.tileSize,
          58,
          label,
          {
            color: REVIEW.mutedColor,
            fontFamily: REVIEW.fontFamily,
            fontSize: REVIEW.stateFontSize,
          },
        ).setOrigin(0.5, 0);
      }
    }
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: REVIEW.width,
  height: REVIEW.height,
  backgroundColor: REVIEW.backgroundColor,
  parent: document.body,
  render: { antialias: true, roundPixels: false },
  scene: [LayeredGroundDamageV3Scene],
});

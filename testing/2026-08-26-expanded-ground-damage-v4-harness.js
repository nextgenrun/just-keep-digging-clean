import {
  WORLD_VISUAL_DAMAGE,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageMixProfile,
} from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_DAMAGE_EXPANDED_REVIEW as REVIEW } from
  "../values/worldVisualDamageExpandedReview.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_MATERIALS } from "../values/worldVisualMaterials.js";
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

class ExpandedGroundDamageV4Scene extends Phaser.Scene {
  constructor() {
    super("ExpandedGroundDamageV4Scene");
    this.damagePainter = null;
    const requestedPanel = Number(new URLSearchParams(location.search).get("panel"));
    this.panelIndex = Math.max(
      0,
      Math.min(REVIEW.panelCount - 1, Number.isInteger(requestedPanel) ? requestedPanel : 0),
    );
    const firstProfile = this.panelIndex * REVIEW.profilesPerPanel;
    this.profiles = REVIEW.profiles.slice(
      firstProfile,
      firstProfile + REVIEW.profilesPerPanel,
    );
  }

  preload() {
    const semantic = WORLD_VISUAL_SEMANTIC_ASSETS;
    const reviewMaterials = [...new Set(this.profiles.map(profile => profile.material))]
      .map(materialId => WORLD_VISUAL_MATERIALS[materialId]);
    const assets = [
      ...getWorldVisualDamagePreloadAssets(),
      ...reviewMaterials,
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
    const mix = resolveWorldVisualDamageMixProfile();
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
    this._drawHeaders(atlas);

    for (const [row, profile] of this.profiles.entries()) {
      const profileIndex = this.panelIndex * REVIEW.profilesPerPanel + row;
      const panelX = REVIEW.panelX;
      const y = REVIEW.firstRowY + (row + 0.5) * REVIEW.tileSize;
      const tileType = TILE_TYPES[profile.tileType];
      this._drawLabel(profile, profileIndex, panelX, y);

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
        this._showSemantic(profile, tileType, x, y, profileIndex);
        this.damagePainter.draw(
          x / REVIEW.tileSize - 0.5,
          y / REVIEW.tileSize - 0.5,
          WORLD_VISUAL_DAMAGE.stages[stateIndex].minDamage,
          REVIEW.tileSize,
          profileIndex * 41 + 17,
          profileIndex * 67 + 23,
          tileType,
        );
      }
    }

    globalThis.__EXPANDED_GROUND_DAMAGE_V4__ = Object.freeze({
      ready: true,
      selectedRevision: atlas.revision,
      selectedAtlasPath: atlas.path,
      profileCount: REVIEW.profiles.length,
      displayedProfileCount: this.profiles.length,
      panelIndex: this.panelIndex,
      stateCount: REVIEW.states.length,
      structuralPool: this.damagePainter.pool.length,
      rimPool: this.damagePainter.rimPool.length,
      responsePool: this.damagePainter.responsePool.length,
      logicalTilePx: REVIEW.tileSize,
      authoredMotifs: atlas.variants,
      rasterTiers: atlas.rasterTiers,
      transformCount: atlas.transformCount,
      responseMode: mix?.response.mode || null,
      effectiveStructuralCombinations: WORLD_VISUAL_DAMAGE.imagegen
        .effectiveStructuralCombinations,
      decodedBytes: WORLD_VISUAL_DAMAGE.imagegen.decodedBytes,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
      productionPainter: REVIEW.productionPainter,
    });
    document.body.dataset.expandedGroundDamageV4Ready = "true";
    document.body.dataset.selectedRevision = atlas.revision;
    document.body.dataset.reviewPanel = `${this.panelIndex}`;
    document.body.dataset.profileCount = `${this.profiles.length}`;
    document.body.dataset.renderer = this.game.renderer.type === Phaser.WEBGL
      ? "webgl"
      : "canvas";
  }

  _drawLabel(profile, profileIndex, x, y) {
    this.add.text(x, y - 10, `${profileIndex + 1}. ${profile.tileType}`, {
      color: REVIEW.labelColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.labelFontSize,
    }).setOrigin(0, 0.5).setDepth(REVIEW.damageDepth);
    this.add.text(x, y + 10, `${profile.family} / ${profile.material}`, {
      color: REVIEW.familyColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.familyFontSize,
    }).setOrigin(0, 0.5).setDepth(REVIEW.damageDepth);
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

  _drawHeaders(atlas) {
    const first = this.panelIndex * REVIEW.profilesPerPanel + 1;
    const last = first + this.profiles.length - 1;
    this.add.text(10, 10, `EXPANDED DAMAGE V4 · PROFILES ${first}-${last} · ${atlas.revision.toUpperCase()}`, {
      color: REVIEW.headerColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: "18px",
    });
    this.add.text(
      10,
      36,
      `${atlas.variants} MOTIFS / ${atlas.transformCount} TRANSFORMS / `
        + `${atlas.rasterTiers} RASTER TIERS / 12 LOGICAL STATES`,
      {
      color: REVIEW.mutedColor,
      fontFamily: REVIEW.fontFamily,
      fontSize: REVIEW.stateFontSize,
      },
    );
    for (const [column, label] of REVIEW.stateLabels.entries()) {
      this.add.text(
        REVIEW.panelX + REVIEW.labelWidth + (column + 0.5) * REVIEW.tileSize,
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

new Phaser.Game({
  type: Phaser.AUTO,
  width: REVIEW.width,
  height: REVIEW.height,
  backgroundColor: REVIEW.backgroundColor,
  parent: document.body,
  render: { antialias: true, roundPixels: false },
  scene: [ExpandedGroundDamageV4Scene],
});

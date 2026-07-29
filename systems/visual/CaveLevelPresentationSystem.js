/**
 * CaveLevelPresentationSystem — renders authored cave-level art and hides structural collision tiles.
 */
import { CAVE_LEVEL_CONFIG } from "../../values/caveLevelConfig.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export class CaveLevelPresentationSystem {
  constructor(scene, options) {
    this.scene = scene;
    this.config = options.config;
    this.expanded = options.expanded;
    this.visualPack = options.visualPack;
    this.backgroundPreset = options.backgroundPreset;
    this.entryData = options.entryData;
    this.archetype = options.archetype;
    this.worldModel = options.worldModel;
    this.worldRenderer = options.worldRenderer;
    this.exitLabel = null;
    this.gpText = null;
  }

  create() {
    this._createBackground();
    this._maskStructuralTiles();
    this._createIdentity();
    this._createExitAndHud();
  }

  setGp(value, maximum) {
    this.gpText?.setText(`GP ${value} / ${maximum}`);
  }

  setExitPrompt(text, visible) {
    this.exitLabel?.setText(text).setVisible(visible);
  }

  _createBackground() {
    const width = this.config.worldWidthPx;
    const height = this.config.worldDepthPx;
    const textureKey = this.expanded
      ? this.visualPack?.textureKey
      : this.backgroundPreset?.textureKey;
    this.scene.cameras.main.setBackgroundColor(CAVE_SCENE_CONFIG.background.fallbackColor);
    if (!textureKey || !this.scene.textures.exists(textureKey)) return;
    this.scene.add.image(width / 2, height / 2, textureKey)
      .setDisplaySize(width, height)
      .setDepth(this.expanded ? CAVE_LEVEL_CONFIG.presentation.backgroundDepth : -10);
  }

  _maskStructuralTiles() {
    if (!this.expanded) return;
    const layer = this.worldRenderer?.layer;
    if (!layer?.forEachTile) return;
    layer.forEachTile((tile) => {
      if (this.worldModel.getTileType(tile.x, tile.y) !== TILE_TYPES.CAVE_WALL) return;
      tile.alpha = CAVE_LEVEL_CONFIG.presentation.structuralTileAlpha;
    });
  }

  _createIdentity() {
    const legacy = CAVE_SCENE_CONFIG.presentation;
    const expanded = CAVE_LEVEL_CONFIG.presentation;
    const tileSize = this.config.tileSize;
    const titleX = this.expanded ? expanded.titleTileX * tileSize : this.config.worldWidthPx / 2;
    const titleY = (this.expanded ? expanded.titleTileY : legacy.titleTileY) * tileSize;
    const hintX = this.expanded ? expanded.hintTileX * tileSize : this.config.worldWidthPx / 2;
    const hintY = (this.expanded ? expanded.hintTileY : legacy.hintTileY) * tileSize;
    const title = this.entryData?.displayName || this.archetype.journalLabel;
    const hint = this.entryData?.discoveryHint || this.archetype.hint;
    this.scene.add.text(titleX, titleY, title.toUpperCase(), {
      fontFamily: "Georgia, serif",
      fontSize: `${this.expanded ? expanded.titleFontSizePx : legacy.titleFontSizePx}px`,
      color: legacy.titleColor,
      stroke: legacy.textStrokeColor,
      strokeThickness: legacy.titleStrokeThickness,
    }).setOrigin(0.5).setDepth(5);
    this.scene.add.text(hintX, hintY, hint, {
      fontFamily: "Georgia, serif",
      fontSize: `${this.expanded ? expanded.hintFontSizePx : legacy.hintFontSizePx}px`,
      color: legacy.hintColor,
      stroke: legacy.textStrokeColor,
      strokeThickness: legacy.hintStrokeThickness,
    }).setOrigin(0.5).setDepth(5);
  }

  _createExitAndHud() {
    const tileSize = this.config.tileSize;
    const grid = this.expanded ? CAVE_LEVEL_CONFIG.grid : CAVE_SCENE_CONFIG.grid;
    const exit = CAVE_SCENE_CONFIG.exit;
    const mouth = CAVE_SCENE_CONFIG.presentation.exitMouth;
    const exitX = (exit.tileX + 0.5) * tileSize;
    const exitY = grid.floorRow * tileSize;
    const entranceTexture = CAVE_SCENE_CONFIG.overworldEntrance.scenic.textureKey;
    if (this.scene.textures.exists(entranceTexture)) {
      this.scene.add.image(exitX, exitY + mouth.floorOffsetTiles * tileSize, entranceTexture)
        .setOrigin(mouth.originX, mouth.originY)
        .setDisplaySize(mouth.displayWidthTiles * tileSize, mouth.displayHeightTiles * tileSize)
        .setDepth(CAVE_LEVEL_CONFIG.presentation.entranceDepth)
        .setAlpha(mouth.alpha);
    }
    this.exitLabel = this.scene.add.text(exitX, exitY - exit.labelOffsetTiles * tileSize, "", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: exit.labelColor,
      stroke: CAVE_SCENE_CONFIG.presentation.textStrokeColor,
      strokeThickness: CAVE_SCENE_CONFIG.presentation.hintStrokeThickness,
    }).setOrigin(0.5, 1).setDepth(5).setVisible(false);
    const hud = CAVE_LEVEL_CONFIG.presentation;
    this.gpText = this.scene.add.text(
      this.scene.scale.width - hud.hudInsetPx,
      hud.hudTopPx,
      "",
      {
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        color: CAVE_SCENE_CONFIG.feedback.gpColor,
        stroke: CAVE_SCENE_CONFIG.presentation.textStrokeColor,
        strokeThickness: CAVE_SCENE_CONFIG.presentation.hintStrokeThickness,
      },
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(hud.hudDepth);
  }
}

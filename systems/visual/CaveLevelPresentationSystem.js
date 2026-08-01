/**
 * CaveLevelPresentationSystem — renders one continuous authored cave interior over mineable terrain.
 */
import { CAVE_LEVEL_CONFIG } from "../../values/caveLevelConfig.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { hasApprovedHudSkin } from "./ApprovedHudSkin.js";


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
    this.gpFrame = null;
    this.backgroundImage = null;
  }

  create() {
    this._createBackground();
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
    this.backgroundImage = this.scene.add.image(width / 2, height / 2, textureKey)
      .setDisplaySize(width, height)
      .setDepth(this.expanded ? CAVE_LEVEL_CONFIG.presentation.backgroundDepth : -10)
      .setName(this.expanded ? "cave-level-continuous-interior" : "cave-level-legacy-interior");
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
      fontFamily: UI_FONTS.display,
      fontSize: `${this.expanded ? expanded.titleFontSizePx : legacy.titleFontSizePx}px`,
      color: legacy.titleColor,
      stroke: legacy.textStrokeColor,
      strokeThickness: legacy.titleStrokeThickness,
    }).setOrigin(0.5).setDepth(5);
    this.scene.add.text(hintX, hintY, hint, {
      fontFamily: UI_FONTS.body,
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
      fontFamily: UI_FONTS.body,
      fontSize: "16px",
      color: exit.labelColor,
      stroke: CAVE_SCENE_CONFIG.presentation.textStrokeColor,
      strokeThickness: CAVE_SCENE_CONFIG.presentation.hintStrokeThickness,
    }).setOrigin(0.5, 1).setDepth(5).setVisible(false);
    const hud = CAVE_LEVEL_CONFIG.presentation;
    const gpHud = hud.gpHud;
    const hudX = this.scene.scale.width - hud.hudInsetPx;
    const approved = hasApprovedHudSkin(this.scene);
    if (approved) {
      this.gpFrame = this.scene.add.image(
        hudX,
        hud.hudTopPx,
        ASSET_KEYS.ui.approvedHud.buffChip,
      ).setOrigin(1, 0)
        .setDisplaySize(gpHud.frameWidthPx, gpHud.frameHeightPx)
        .setScrollFactor(0)
        .setDepth(hud.hudDepth);
    }
    this.gpText = this.scene.add.text(
      approved ? hudX - gpHud.frameWidthPx / 2 : hudX,
      approved
        ? hud.hudTopPx + gpHud.frameHeightPx / 2 + gpHud.textOffsetYPx
        : hud.hudTopPx,
      "",
      {
        fontFamily: approved ? APPROVED_HUD_SKIN.font.family : UI_FONTS.mono,
        fontSize: `${gpHud.fontSizePx}px`,
        fontStyle: approved ? "bold" : "normal",
        color: approved ? APPROVED_HUD_SKIN.font.cyan : CAVE_SCENE_CONFIG.feedback.gpColor,
        stroke: approved ? APPROVED_HUD_SKIN.font.shadow : CAVE_SCENE_CONFIG.presentation.textStrokeColor,
        strokeThickness: approved
          ? APPROVED_HUD_SKIN.font.strokeThickness
          : CAVE_SCENE_CONFIG.presentation.hintStrokeThickness,
      },
    ).setOrigin(approved ? 0.5 : 1, approved ? 0.5 : 0)
      .setScrollFactor(0)
      .setDepth(hud.hudTextDepth);
  }

  destroy() {
    this.backgroundImage = null;
    this.gpFrame = null;
  }
}

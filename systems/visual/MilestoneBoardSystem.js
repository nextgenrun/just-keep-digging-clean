import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { DEPTH_MILESTONES, getMilestoneAtDepth, computeMilestoneBonuses } from "../../values/depthMilestones.js";
import { TOWN_SQUARE_CONFIG } from "../../values/townSquareConfig.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { PILLAR_VISUAL_CONFIG, resolvePillarStageIndex } from "../../values/pillarVisuals.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { openMilestonePillarModal } from "./MilestonePillarModal.js";
import { ProgressivePillarSprite } from "./ProgressivePillarSprite.js";

/**
 * MilestoneBoardSystem
 * 
 * Renders a milestone board at the left side of town.
 * Tracks player's best depth reached each run and unlocks milestone rewards.
 * Milestones persist per save slot via localStorage.
 */
export class MilestoneBoardSystem {
  constructor(scene, config, worldModel, ui, saveSlot = 1, retentionProgressSystem = null) {
    this.scene = scene;
    this.config = config;
    this.worldModel = worldModel;
    this.ui = ui;
    this.saveSlot = Number.isInteger(saveSlot) && saveSlot > 0 ? saveSlot : 1;
    this.retentionProgressSystem = retentionProgressSystem;

    // Persisted milestone state
    this._reachedDepths = []; // array of depths reached (e.g. [100, 200, 300])
    this._loadMilestones();

    // Approved production pillar visual
    this._pillarVisual = null;
    this._ePrompt = null;
    this._isBoardOpen = false;
    this._boardObjects = [];

    // Track best depth this run for milestone detection
    this._maxDepthThisRun = 0;
    this._pendingMilestoneCheck = false;
  }

  /** Create the approved Milestone Pillar in the town square. */
  create() {
    const ts = this.config.tileSize;
    const pillar = TOWN_SQUARE_CONFIG.milestonePillar;
    const visualConfig = PILLAR_VISUAL_CONFIG.milestone;
    const pillarX = pillar.tileX * ts + ts / 2;
    const baseY = this.config.topAirRows * ts + visualConfig.baseYOffsetPx;
    const bestDepth = this._getBestDepth();
    const stageIndex = resolvePillarStageIndex(bestDepth, visualConfig.stageDepths);

    this._pillarVisual = new ProgressivePillarSprite(
      this.scene,
      pillarX,
      baseY,
      ASSET_KEYS.environment.pillars.milestoneStages,
      visualConfig,
    ).create(stageIndex);

    this._ePrompt = this.scene.add.text(pillarX, this._getPromptY(), this._getPromptText(), {
      fontFamily: UI_FONTS.mono,
      fontSize: `${visualConfig.promptFontSizePx}px`,
      color: UI_COLORS.white,
      stroke: "#000000",
      strokeThickness: 3,
      alpha: visualConfig.promptPulseMinAlpha,
    }).setOrigin(0.5, 1).setDepth(visualConfig.promptDepth).setVisible(false);
    this.scene.tweens.add({
      targets: this._ePrompt,
      alpha: {
        from: visualConfig.promptPulseMinAlpha,
        to: visualConfig.promptPulseMaxAlpha,
      },
      duration: visualConfig.promptPulseDurationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this._boardX = pillarX;
    this._boardY = baseY;
  }

  /**
   * Called every frame - check player proximity to board
   */
  update(playerTile, keys, options = {}) {
    if (!playerTile) return false;
    const inRange = this.isPlayerInRange(playerTile);
    const allowOpen = options.allowOpen !== false;
    this._ePrompt?.setVisible(inRange && (allowOpen || this._isBoardOpen));

    if (keys && inRange && keys.interact && Phaser.Input.Keyboard.JustDown(keys.interact)) {
      if (this._isBoardOpen) {
        this._closeBoardView();
        return true;
      }
      if (allowOpen) {
        this._openBoardView();
        return true;
      }
    }

    // Also close with ESC
    if (keys && this._isBoardOpen && (
      (keys.escape && Phaser.Input.Keyboard.JustDown(keys.escape)) ||
      (keys.hardEscape && Phaser.Input.Keyboard.JustDown(keys.hardEscape))
    )) {
      this._closeBoardView();
      return true;
    }
    return false;
  }

  getInteractionDistance(playerTile) {
    if (!playerTile) return Number.POSITIVE_INFINITY;
    const pillar = TOWN_SQUARE_CONFIG.milestonePillar;
    const interactionTileY = this.config.topAirRows + pillar.interactionTileYOffset;
    return Math.abs(playerTile.tx - pillar.tileX) + Math.abs(playerTile.ty - interactionTileY);
  }

  isPlayerInRange(playerTile) {
    return this.getInteractionDistance(playerTile)
      <= TOWN_SQUARE_CONFIG.milestonePillar.interactionRangeTiles;
  }

  refreshKeybinds() {
    this._ePrompt?.setText(this._getPromptText());
  }

  /**
   * Check if current depth triggers a new milestone
   * Called from PlayScene update
   */
  checkDepthMilestone(depth) {
    if (depth <= this._maxDepthThisRun) return null;
    this._maxDepthThisRun = depth;

    const milestone = getMilestoneAtDepth(depth);
    if (!milestone) return null;

    // Check if already reached
    if (this._reachedDepths.includes(depth)) return null;

    // Reach milestone
    this._reachedDepths.push(depth);
    this._saveMilestones();
    this._updateBoardDisplay();

    // Return the milestone for the scene to handle (flash, shake, etc.)
    return milestone;
  }

  /**
   * Get total bonuses from all milestones
   */
  getBonuses() {
    return computeMilestoneBonuses(this._reachedDepths);
  }

  /**
   * Get the list of reached depths
   */
  getReachedDepths() {
    return [...this._reachedDepths];
  }

  getNextMilestone() {
    const bestDepth = Math.max(
      this.retentionProgressSystem?.getBestDepth?.() || 0,
      this._reachedDepths.length ? Math.max(...this._reachedDepths) : 0
    );
    return DEPTH_MILESTONES.find(milestone => milestone.depth > bestDepth) || null;
  }

  /**
   * Open full milestone board view (scrollable list)
   */
  _openBoardView() {
    if (this._isBoardOpen) return;
    this._isBoardOpen = true;
    this.scene.setShopOpen?.(true);
    const shell = openMilestonePillarModal(this);
    this._boardObjects = [shell];
  }

  _closeBoardView() {
    if (!this._isBoardOpen) return;
    this._isBoardOpen = false;
    this.scene.setShopOpen?.(false);
    const objects = this._boardObjects;
    this._boardObjects = [];
    objects.forEach(obj => {
      if (obj?.hide) obj.hide(() => obj.destroy?.());
      else obj?.destroy?.();
    });
  }

  _updateBoardDisplay() {
    const visualConfig = PILLAR_VISUAL_CONFIG.milestone;
    const stageIndex = resolvePillarStageIndex(
      this._getBestDepth(),
      visualConfig.stageDepths,
    );
    this._pillarVisual?.setStage(stageIndex, true);
    this._ePrompt?.setText(this._getPromptText()).setY(this._getPromptY());
  }

  _getBestDepth() {
    return Math.max(
      this.retentionProgressSystem?.getBestDepth?.() || 0,
      this._maxDepthThisRun || 0,
      this._reachedDepths.length ? Math.max(...this._reachedDepths) : 0,
    );
  }

  _getPromptText() {
    const visualConfig = PILLAR_VISUAL_CONFIG.milestone;
    return `[${USER_SETTINGS.getKeyLabel("interact")}] ${visualConfig.promptText}`
      + `  ${this._reachedDepths.length}/${DEPTH_MILESTONES.length}`;
  }

  _getPromptY() {
    return this._pillarVisual?.getTopY() - PILLAR_VISUAL_CONFIG.milestone.promptOffsetPx;
  }

  _saveMilestones() {
    try {
      localStorage.setItem(`dig-game-milestones-slot-${this.saveSlot}`, JSON.stringify(this._reachedDepths));
    } catch (e) {}
  }

  _loadMilestones() {
    try {
      const storageKey = `dig-game-milestones-slot-${this.saveSlot}`;
      let data = localStorage.getItem(storageKey);
      if (!data && this.saveSlot === 1) {
        data = localStorage.getItem('dig-game-milestones');
        if (data) localStorage.setItem(storageKey, data);
      }
      if (data) {
        this._reachedDepths = JSON.parse(data);
        if (!Array.isArray(this._reachedDepths)) this._reachedDepths = [];
      }
    } catch (e) {
      this._reachedDepths = [];
    }
  }

  destroy() {
    this._closeBoardView();
    this._pillarVisual?.destroy();
    this._pillarVisual = null;
    this._ePrompt?.destroy();
  }
}


import { computeMilestoneBonuses, DEPTH_MILESTONES } from "../../values/depthMilestones.js";
import { MILESTONE_PILLAR_REVIEW } from "../../values/milestonePillarReview.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createButton } from "../../ui/PhaserUiKit.js";
import { createModalShell } from "../../ui/UiModalShell.js";
import { openMilestonePillarModal } from "../../systems/visual/MilestonePillarModal.js";

const PILLAR_TEXTURE_PREFIX = "milestone-pillar-review";

function cssColor(value) {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const optionId = params.get("option") || MILESTONE_PILLAR_REVIEW.defaultOptionId;
  const optionIndex = Math.max(
    0,
    MILESTONE_PILLAR_REVIEW.options.findIndex(option => option.id === optionId),
  );
  const requestedStage = Number.parseInt(params.get("stage") || "", 10);
  const stageIndex = Number.isFinite(requestedStage)
    ? Phaser.Math.Clamp(requestedStage - 1, 0, MILESTONE_PILLAR_REVIEW.stageDepths.length - 1)
    : MILESTONE_PILLAR_REVIEW.defaultStageIndex;
  return { optionIndex, stageIndex, openUi: params.get("ui") === "1" };
}

export class MilestonePillarReviewScene extends Phaser.Scene {
  constructor() {
    super("MilestonePillarReviewScene");
  }

  preload() {
    this.load.image("milestone-pillar-town", MILESTONE_PILLAR_REVIEW.gameplayBackgroundPath);
    this.load.json("milestone-pillar-manifest", MILESTONE_PILLAR_REVIEW.manifestPath);
    MILESTONE_PILLAR_REVIEW.options.forEach(option => {
      MILESTONE_PILLAR_REVIEW.stageDepths.forEach((_, stageIndex) => {
        this.load.image(
          `${PILLAR_TEXTURE_PREFIX}-${option.id}-${stageIndex + 1}`,
          `option-${option.id}-stage-${stageIndex + 1}.png`,
        );
      });
    });
  }

  create() {
    const initial = readInitialState();
    this._optionIndex = initial.optionIndex;
    this._stageIndex = initial.stageIndex;
    this._manifest = this.cache.json.get("milestone-pillar-manifest");
    this._optionButtons = [];
    this._stageButtons = [];
    this._modal = null;

    this._buildBackdrop();
    this._buildWorldPreview();
    this._buildControls();
    this._refreshSelection();
    this._bindKeyboard();
    if (initial.openUi) this.time.delayedCall(80, () => this._openMilestoneUi());
  }

  _buildBackdrop() {
    const cfg = MILESTONE_PILLAR_REVIEW.worldPreview;
    const background = this.add.image(640, 360, "milestone-pillar-town")
      .setDisplaySize(1280, 720)
      .setAlpha(cfg.backgroundAlpha);
    const shade = this.add.graphics();
    shade.fillStyle(0x03070a, 0.34);
    shade.fillRect(0, 0, 1280, 720);
    shade.fillStyle(0x071017, 0.78);
    shade.fillRoundedRect(452, 82, 788, 152, 9);
    shade.lineStyle(1, UI_COLORS.borderDim, 0.9);
    shade.strokeRoundedRect(452, 82, 788, 152, 9);
    background.setDepth(0);
    shade.setDepth(1);
  }

  _buildWorldPreview() {
    const cfg = MILESTONE_PILLAR_REVIEW.worldPreview;
    this._pillarGlow = this.add.ellipse(
      cfg.detailPillarX,
      cfg.detailGroundY - cfg.detailMaxPillarHeight * 0.45,
      cfg.detailMaxPillarHeight * 0.86,
      cfg.detailMaxPillarHeight * 1.08,
      0x62c9dc,
      0.13,
    ).setDepth(3);
    this._pillarImage = this.add.image(
      cfg.detailPillarX,
      cfg.detailGroundY,
      `${PILLAR_TEXTURE_PREFIX}-a-1`,
    )
      .setOrigin(0.5, 1)
      .setDepth(5);
    this._worldPillarImage = this.add.image(
      cfg.worldPillarX,
      cfg.worldGroundY,
      `${PILLAR_TEXTURE_PREFIX}-a-1`,
    ).setOrigin(0.5, 1).setDepth(8);

    const scaleGuide = this.add.graphics().setDepth(6);
    const guideX = cfg.playerGuideX;
    const guideTop = cfg.worldGroundY - cfg.playerHeightPx;
    scaleGuide.lineStyle(2, UI_COLORS.borderSel, 0.8);
    scaleGuide.lineBetween(guideX, guideTop, guideX, cfg.worldGroundY);
    scaleGuide.lineBetween(guideX - 7, guideTop, guideX + 7, guideTop);
    scaleGuide.lineBetween(guideX - 7, cfg.worldGroundY, guideX + 7, cfg.worldGroundY);
    this.add.text(guideX - 13, guideTop + 3, "1.75M PLAYER", {
      fontFamily: UI_FONTS.mono,
      fontSize: "12px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    }).setOrigin(1, 0).setDepth(6);
    this.add.text(cfg.detailPillarX, cfg.detailGroundY + 10, "DETAIL ZOOM  •  WORLD SCALE SHOWN AT RIGHT", {
      fontFamily: UI_FONTS.mono,
      fontSize: "11px",
      fontStyle: "bold",
      color: UI_COLORS.body,
    }).setOrigin(0.5, 0).setDepth(6);

    this._reviewFlag = this.add.text(26, 74, "REVIEW ONLY  •  PHASER CANVAS", {
      fontFamily: UI_FONTS.mono,
      fontSize: "12px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
      backgroundColor: "rgba(7, 14, 19, .82)",
      padding: { x: 10, y: 7 },
    }).setDepth(12);
    this._titleText = this.add.text(cfg.titleX, cfg.titleY, "", {
      fontFamily: UI_FONTS.display,
      fontSize: "28px",
      fontStyle: "bold",
      color: UI_COLORS.title,
    }).setDepth(12);
    this._summaryText = this.add.text(cfg.titleX, cfg.summaryY, "", {
      fontFamily: UI_FONTS.body,
      fontSize: "16px",
      color: UI_COLORS.body,
      wordWrap: { width: cfg.summaryWidth, useAdvancedWrap: true },
      lineSpacing: 5,
    }).setDepth(12);
    this._stageText = this.add.text(cfg.titleX, cfg.summaryY + 58, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: "14px",
      fontStyle: "bold",
      color: UI_COLORS.gold,
    }).setDepth(12);
  }

  _buildControls() {
    const cfg = MILESTONE_PILLAR_REVIEW.worldPreview;
    const totalOptionWidth = MILESTONE_PILLAR_REVIEW.options.length * cfg.optionButtonWidth
      + (MILESTONE_PILLAR_REVIEW.options.length - 1) * cfg.optionButtonGap;
    const optionStartX = (1280 - totalOptionWidth) / 2 + cfg.optionButtonWidth / 2;
    MILESTONE_PILLAR_REVIEW.options.forEach((option, index) => {
      this._optionButtons.push(createButton(this, {
        x: optionStartX + index * (cfg.optionButtonWidth + cfg.optionButtonGap),
        y: cfg.controlsTop + cfg.optionButtonHeight / 2,
        width: cfg.optionButtonWidth,
        height: cfg.optionButtonHeight,
        label: `${index + 1}  ${option.label}`,
        accent: option.accent,
        fontSize: "12px",
        autoIcon: false,
        onClick: () => this._selectOption(index),
      }));
    });

    const stageStartX = 30 + cfg.stageButtonWidth / 2;
    MILESTONE_PILLAR_REVIEW.stageLabels.forEach((label, index) => {
      this._stageButtons.push(createButton(this, {
        x: stageStartX + index * (cfg.stageButtonWidth + cfg.stageButtonGap),
        y: cfg.stageControlsY,
        width: cfg.stageButtonWidth,
        height: cfg.stageButtonHeight,
        label,
        accent: UI_COLORS.borderSel,
        fontSize: "11px",
        autoIcon: false,
        onClick: () => this._selectStage(index),
      }));
    });

    this._openUiButton = createButton(this, {
      x: cfg.openUiX,
      y: cfg.openUiY,
      width: 250,
      height: 46,
      label: "OPEN MILESTONE UI",
      hint: "U",
      icon: "journal",
      accent: UI_COLORS.borderGood,
      onClick: () => this._openMilestoneUi(),
    });
  }

  _selectOption(index) {
    if (this._modal) return;
    this._optionIndex = Phaser.Math.Clamp(index, 0, MILESTONE_PILLAR_REVIEW.options.length - 1);
    this._refreshSelection();
  }

  _selectStage(index) {
    if (this._modal) return;
    this._stageIndex = Phaser.Math.Clamp(index, 0, MILESTONE_PILLAR_REVIEW.stageDepths.length - 1);
    this._refreshSelection();
  }

  _refreshSelection() {
    const cfg = MILESTONE_PILLAR_REVIEW.worldPreview;
    const option = MILESTONE_PILLAR_REVIEW.options[this._optionIndex];
    const stageEntry = this._manifest.options[this._optionIndex].stages[this._stageIndex];
    const maxHeight = Math.max(...this._manifest.options[this._optionIndex].stages.map(stage => stage.height));
    const detailScale = cfg.detailMaxPillarHeight / maxHeight;
    const worldScale = cfg.worldMaxPillarHeight / maxHeight;
    this._pillarImage
      .setTexture(`${PILLAR_TEXTURE_PREFIX}-${option.id}-${this._stageIndex + 1}`)
      .setScale(detailScale);
    this._worldPillarImage
      .setTexture(`${PILLAR_TEXTURE_PREFIX}-${option.id}-${this._stageIndex + 1}`)
      .setScale(worldScale);
    this._pillarGlow.setFillStyle(option.accent, 0.13);
    this._titleText.setText(`OPTION ${option.id.toUpperCase()}  •  ${option.title.toUpperCase()}`);
    this._titleText.setColor(cssColor(option.accent));
    this._summaryText.setText(option.summary);
    const depth = MILESTONE_PILLAR_REVIEW.stageDepths[this._stageIndex];
    const endDepth = this._stageIndex === MILESTONE_PILLAR_REVIEW.stageDepths.length - 1
      ? 2000
      : MILESTONE_PILLAR_REVIEW.stageDepths[this._stageIndex + 1] - 1;
    const heightMeters = (stageEntry.height / maxHeight * 2.2).toFixed(2);
    this._stageText.setText(
      `STATE ${this._stageIndex + 1}/5  •  ${depth}-${endDepth}M  •  APPROX. ${heightMeters}M TALL`,
    );
    this._optionButtons.forEach((button, index) => button.setSelected(index === this._optionIndex));
    this._stageButtons.forEach((button, index) => button.setSelected(index === this._stageIndex));
  }

  _buildPreviewSystem() {
    const previewDepth = this._stageIndex === MILESTONE_PILLAR_REVIEW.stageDepths.length - 1
      ? 1800
      : MILESTONE_PILLAR_REVIEW.stageDepths[this._stageIndex];
    const reached = DEPTH_MILESTONES
      .filter(milestone => milestone.depth <= previewDepth)
      .map(milestone => milestone.depth);
    const stats = {
      bestDepth: previewDepth,
      totalTilesBroken: previewDepth * 17,
      totalResources: previewDepth * 4,
      resourcesSold: previewDepth * 3,
      highestCombo: Math.max(12, Math.floor(previewDepth / 5)),
      starsCollected: Math.floor(previewDepth / 220),
      chestsOpened: Math.floor(previewDepth / 180),
      portalsActivated: Math.floor(previewDepth / 500),
      relicsFound: Math.floor(previewDepth / 650),
      earthquakesSurvived: Math.floor(previewDepth / 160),
    };
    return {
      scene: this,
      ui: { createModalShell, createButton },
      retentionProgressSystem: {
        getBestDepth: () => previewDepth,
        getJournalSnapshot: () => ({
          stats,
          discoveries: {
            materials: ["dirt", "stone", "copper", "iron"],
            portals: previewDepth >= 1000 ? ["Sky Island"] : [],
            journal: ["depth:100", "cave-1", "geode-1", "earthquake"],
          },
        }),
      },
      getReachedDepths: () => [...reached],
      getNextMilestone: () => DEPTH_MILESTONES.find(milestone => milestone.depth > previewDepth) || null,
      getBonuses: () => computeMilestoneBonuses(reached),
      _closeBoardView: () => this._closeMilestoneUi(),
    };
  }

  _openMilestoneUi() {
    if (this._modal) return;
    this._modal = openMilestonePillarModal(this._buildPreviewSystem());
  }

  _closeMilestoneUi() {
    const shell = this._modal;
    this._modal = null;
    if (!shell) return;
    shell.hide(() => shell.destroy());
  }

  _bindKeyboard() {
    this.input.keyboard.on("keydown", event => {
      if (this._modal) {
        if (event.code === "Escape" || event.code === "KeyU") this._closeMilestoneUi();
        return;
      }
      if (event.code.startsWith("Digit")) {
        const index = Number.parseInt(event.code.slice(-1), 10) - 1;
        if (index >= 0 && index < MILESTONE_PILLAR_REVIEW.options.length) this._selectOption(index);
      } else if (event.code === "ArrowLeft") {
        this._selectStage(this._stageIndex - 1);
      } else if (event.code === "ArrowRight") {
        this._selectStage(this._stageIndex + 1);
      } else if (event.code === "KeyU" || event.code === "Enter") {
        this._openMilestoneUi();
      }
    });
  }
}

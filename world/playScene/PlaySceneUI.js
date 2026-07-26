/**
 * PlayScene UI Module
 * Handles overlays, status bars, safe return line, and save/load functionality
 */

import { WelcomeMessageGenerator } from "../model/WelcomeMessageGenerator.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createIconBadge, createModalShell } from "../../ui/UiModalShell.js";
import {
  createButton,
  createFocusController,
  createHintLegend,
  createPanel,
  createTabBar,
} from "../../ui/PhaserUiKit.js";
import { createSettingsPanelContent } from "../../ui/overlays/SettingsPanelContent.js";
import { UIMuteToggle } from "../../ui/hud/UIMuteToggle.js";
import { UIInventoryPopup } from "../../ui/overlays/UIInventoryPopup.js";
import { ShopOverlay } from "../../ui/overlays/ShopOverlay.js";
import { XPProgressBar } from "../../ui/hud/XPProgressBar.js";
import { LevelUpPopup } from "../../ui/overlays/LevelUpPopup.js";
import { UINotificationSystem } from "../../ui/UINotificationSystem.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

/**
 * Mix in UI methods to PlayScene prototype
 */
export function setupUIMethods(prototype) {
  prototype.createOverlay = function() {
    this.overlayManager.createOverlay();
  };

  prototype.createSceneUI = function() {
    if (this._sceneUIInitialized) return;
    this._sceneUIInitialized = true;

    this.uiNotifications = new UINotificationSystem(this);
    this.uiMuteToggle = new UIMuteToggle(this, this.soundSystem, this.config.viewportWidth - 123, 20);
    this.uiInventoryPopup = new UIInventoryPopup(this);
    this.shopOverlay = new ShopOverlay(this, this.upgradeSystem, this.soundSystem);
    this.xpProgressBar = new XPProgressBar(this);
    this.levelUpPopup = new LevelUpPopup(this);
  };

  prototype.destroySceneUI = function() {
    if (!this._sceneUIInitialized) return;
    this._sceneUIInitialized = false;

    this.uiNotifications?.destroy();
    this.uiMuteToggle?.destroy();
    this.uiInventoryPopup?.destroy();
    this.shopOverlay?.destroy();
    this.xpProgressBar?.destroy();
    this.levelUpPopup?.destroy();

    this.uiNotifications = null;
    this.uiMuteToggle = null;
    this.uiInventoryPopup = null;
    this.shopOverlay = null;
    this.xpProgressBar = null;
    this.levelUpPopup = null;
  };

  prototype.showOverlay = function(title, body) {
    this.overlayManager.showOverlay(title, body);
  };

  prototype.hideOverlay = function() {
    this.overlayManager.hideOverlay();
  };

  prototype.showGameDialog = function(title, body) {
    this.gameState = "dialog";
    this.shopOverlay?.hide();
    this.overlayManager.showGameDialog(title, body);
  };

  prototype.drawStatusBars = function(gemPowerPct, gpRaw, gpMax) {
    if (
      gemPowerPct === this._lastGemPowerBarPct &&
      gpRaw === this._lastGemPowerBarRaw &&
      gpMax === this._lastGemPowerBarMax
    ) {
      return;
    }
    this._lastGemPowerBarPct = gemPowerPct;
    this._lastGemPowerBarRaw = gpRaw;
    this._lastGemPowerBarMax = gpMax;

    const gpNorm = gemPowerPct / 100;
    const gpColor = gpNorm > HUD_LAYOUT.gpThresholdHigh ? HUD_LAYOUT.gpColorHigh
      : gpNorm > HUD_LAYOUT.gpThresholdMid ? HUD_LAYOUT.gpColorMid
      : HUD_LAYOUT.gpColorLow;
    const approvedLayout = this.hudSystem?.getGemPowerLayout?.();
    const barX = approvedLayout?.x ?? HUD_LAYOUT.barX;
    const barY = approvedLayout?.y ?? HUD_LAYOUT.gpBarY;
    const barW = approvedLayout?.width ?? HUD_LAYOUT.barW;
    const barH = approvedLayout?.height ?? HUD_LAYOUT.barH;
    const barRadius = approvedLayout?.radius ?? 3;

    this._gemPowerBarBg.clear();
    this._gemPowerBarBg.fillStyle(HUD_LAYOUT.barBgColor, HUD_LAYOUT.barBgAlpha);
    this._gemPowerBarBg.fillRoundedRect(barX, barY, barW, barH, barRadius);

    this._gemPowerBarFill.clear();
    this._gemPowerBarFill.fillStyle(gpColor, 1);
    this._gemPowerBarFill.fillRoundedRect(barX, barY, Math.max(barW * gpNorm, 0.1), barH, barRadius);

    if (this._gpLabelText) {
      this._gpLabelText.setText(approvedLayout ? `GP  ${gpRaw} / ${gpMax}` : `GP: ${gpRaw}/${gpMax}`);
    }
  };

  prototype._calcSafeReturnDepth = function() {
    const maxFlyTiles = this.playerController?.abilities?.getMaxFlightHeightTiles?.();
    const fallbackTiles = this.config.safeReturnDepthTiles ?? 3;
    const depthTiles = Number.isFinite(maxFlyTiles) ? Math.floor(maxFlyTiles) : fallbackTiles;
    return Math.max(2, Math.min(depthTiles, this.config.climbWarningDepthTiles - 1));
  };

  prototype._refreshSafeReturnLine = function() {
    const depth = this._calcSafeReturnDepth();
    if (depth === this._lastSafeReturnDepth) return;
    this._lastSafeReturnDepth = depth;

    const lineY = (this.config.topAirRows + depth) * this.config.tileSize;
    this._safeReturnGfx.clear();
    this._safeReturnGfx.lineStyle(HUD_LAYOUT.warnLineWidth, HUD_LAYOUT.safeLineColor, HUD_LAYOUT.safeLineAlpha);
    this._safeReturnGfx.lineBetween(0, lineY, this.config.worldWidthPx, lineY);

    this._safeReturnText.setPosition(HUD_LAYOUT.warnTextX, lineY + HUD_LAYOUT.warnTextOffsetY);
    this._safeReturnText.setText(
      `✓  Current flight return range: ~${depth} tiles`
    );
  };

  prototype._generateWelcomeMessage = function() {
    const saveData = this._cachedSaveData;
    return WelcomeMessageGenerator.generateMessage(saveData);
  };

  // Unified pause menu implementation.
  prototype.showPauseMenu = function() {
    if (this._pausePanel) return;
    this.gameState = "paused";
    this.playerController.setControlsEnabled(false);

    const shell = createModalShell(this, {
      title: "PAUSED",
      subtitle: "Run controls, progression, and settings",
      icon: "pause",
      maxWidth: 940,
      maxHeight: 640,
      depth: 2500,
      onClose: () => this.resumeGame(),
    });
    const rect = shell.getContentRect();
    const tabContent = this.add.container(0, 0);
    shell.content.add(tabContent);
    const state = {
      activeTab: 0,
      controls: [],
      focus: null,
      tabs: null,
      hint: null,
      settings: null,
      tabContent,
    };
    this._currentPauseTab = 0;

    const clearContent = () => {
      state.settings?.destroy?.();
      state.settings = null;
      state.controls = [];
      tabContent.removeAll(true);
    };

    const addText = (x, y, value, style = {}, originX = 0, originY = 0) => {
      const text = this.add.text(x, y, value, {
        fontFamily: style.fontFamily || UI_FONTS.body,
        fontSize: style.fontSize || "13px",
        fontStyle: style.fontStyle,
        color: style.color || UI_COLORS.body,
        align: style.align,
        lineSpacing: style.lineSpacing,
        wordWrap: style.wordWrap,
      }).setOrigin(originX, originY);
      tabContent.add(text);
      return text;
    };

    const addSurface = (x, y, width, height, selected = false) => {
      const gfx = this.add.graphics();
      gfx.fillStyle(selected ? UI_COLORS.cardSel : UI_COLORS.cardBase, 0.98);
      gfx.fillRoundedRect(x, y, width, height, 7);
      gfx.lineStyle(selected ? 2 : 1, selected ? UI_COLORS.borderSel : UI_COLORS.borderDim, 0.96);
      gfx.strokeRoundedRect(x, y, width, height, 7);
      tabContent.add(gfx);
      return gfx;
    };

    const bodyTop = rect.top + 56;
    const bodyHeight = rect.bottom - bodyTop;
    const buildGeneral = () => {
      const gap = 16;
      const leftWidth = Math.min(430, rect.width * 0.49);
      const rightX = rect.left + leftWidth + gap;
      const rightWidth = rect.width - leftWidth - gap;
      addSurface(rect.left, bodyTop, leftWidth, bodyHeight, false);
      addSurface(rightX, bodyTop, rightWidth, bodyHeight, true);

      addText(rect.left + 18, bodyTop + 17, "RUN ACTIONS", {
        fontFamily: UI_FONTS.display,
        fontSize: "15px",
        fontStyle: "bold",
        color: UI_COLORS.title,
      });

      const currentTile = this.playerController?.getPlayerTile?.();
      const atTown = currentTile
        && currentTile.ty >= this.config.topAirRows - 4
        && currentTile.ty <= this.config.topAirRows;
      const deepestPortal = atTown ? this.specialTileSystem?.getDeepestPortal?.() : null;
      const definitions = [
        { label: "RESUME GAME", icon: "play", accent: UI_COLORS.borderSel, action: () => this.resumeGame() },
        ...(deepestPortal ? [{
          label: `QUICK RESUME  •  L${deepestPortal.levelId} ${deepestPortal.depth}m`,
          icon: "next",
          accent: UI_COLORS.borderGood,
          action: () => {
            const result = this.specialTileSystem?.quickResumeDeepestPortal?.();
            if (result?.success) this.resumeGame();
          },
        }] : []),
        { label: "SAVE GAME", icon: "journal", accent: UI_COLORS.borderGood, action: null },
        { label: "RETURN TO SAFETY", icon: "prev", accent: UI_COLORS.borderHov, action: () => this.unstuckPlayer() },
        { label: "MAIN MENU", icon: "close", accent: UI_COLORS.borderBad, action: () => this.returnToMainMenu() },
      ];
      definitions.forEach((definition, index) => {
        let button;
        button = createButton(this, {
          x: rect.left + leftWidth / 2,
          y: bodyTop + 68 + index * 64,
          width: leftWidth - 34,
          height: index === 0 ? 52 : 46,
          label: definition.label,
          hint: index === 0 ? USER_SETTINGS.getKeyLabel("pause") + " / ESC" : "",
          icon: definition.icon,
          accent: definition.accent,
          fontSize: index === 0 ? "14px" : "12px",
          align: "left",
          parent: tabContent,
          onFocus: () => state.focus?.setIndex?.(index),
          onClick: () => {
            if (definition.label === "SAVE GAME") {
              this.saveGame({ setText: value => button.setLabel(value) });
            } else {
              definition.action?.();
            }
          },
        });
        state.controls.push(button);
      });

      createIconBadge(this, "journal", {
        x: rightX + 56,
        y: bodyTop + 58,
        size: 70,
        iconSize: 58,
        selected: true,
        parent: tabContent,
      });
      addText(rightX + 104, bodyTop + 28, "RUN SNAPSHOT", {
        fontFamily: UI_FONTS.display,
        fontSize: "20px",
        fontStyle: "bold",
        color: UI_COLORS.title,
      });
      addText(rightX + 104, bodyTop + 58, "Current progress at a glance", {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: UI_COLORS.gold,
      });

      const tile = this.playerController?.getPlayerTile?.();
      const depth = tile ? Math.max(0, tile.ty - this.config.topAirRows + 1) : 0;
      const level = this.playerLevelSystem?.level || 1;
      const wallet = this.upgradeSystem?.getMoney?.() || 0;
      const gp = this.playerController?.getGemPowerRaw?.() || 0;
      const gpMax = this.playerController?.getGemPowerMax?.() || 0;
      const resources = this.digSystem?.getResourceTotals?.() || {};
      const materials = Object.values(resources).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      const buff = this.campfireSystem?.getActiveBuff?.();

      const snapshot = [
        ["DEPTH", depth + "m"],
        ["PLAYER LEVEL", level],
        ["WALLET", Number(wallet).toLocaleString() + " M"],
        ["GEM POWER", Math.floor(gp) + " / " + Math.floor(gpMax)],
        ["MATERIALS", Math.floor(materials).toLocaleString()],
        ["CAMPFIRE", buff ? buff.name.toUpperCase() : "NO ACTIVE BUFF"],
      ];
      const snapshotTop = bodyTop + 118;
      snapshot.forEach((entry, index) => {
        const rowY = snapshotTop + index * 38;
        if (index % 2 === 0) {
          const row = this.add.rectangle(
            rightX + rightWidth / 2,
            rowY + 14,
            rightWidth - 34,
            31,
            UI_COLORS.bg,
            0.72
          );
          tabContent.add(row);
        }
        addText(rightX + 24, rowY + 14, entry[0], {
          fontFamily: UI_FONTS.mono,
          fontSize: "10px",
          color: UI_COLORS.dim,
        }, 0, 0.5);
        addText(rightX + rightWidth - 24, rowY + 14, String(entry[1]), {
          fontFamily: UI_FONTS.display,
          fontSize: "14px",
          fontStyle: "bold",
          color: index === 2 ? UI_COLORS.gold : UI_COLORS.title,
        }, 1, 0.5);
      });
    };

    const buildStats = () => {
      const bonuses = this.playerLevelSystem?.getBonusesSummary?.() || {};
      const effects = this.upgradeSystem?.getUpgradeEffects?.() || {};
      const gp = this.playerController?.getGemPowerRaw?.() || 0;
      const gpMax = this.playerController?.getGemPowerMax?.() || 0;
      const groups = [
        {
          title: "MINING",
          icon: "pickaxe",
          rows: [
            ["PLAYER LEVEL", bonuses.level || 1],
            ["DIG DAMAGE BONUS", "+" + (effects.digDamageAdditive || 0)],
            ["MINING SPEED", "+" + (bonuses.globalMiningSpeed || 0) + "%"],
            ["CRIT CHANCE", (bonuses.criticalHitChance || 0) + "%"],
          ],
        },
        {
          title: "EXPLORATION",
          icon: "boots",
          rows: [
            ["GEM POWER", Math.floor(gp) + " / " + Math.floor(gpMax)],
            ["XP GAIN", "+" + (bonuses.xpMultiplier || 0) + "%"],
            ["RESOURCE LUCK", "+" + (bonuses.resourceLuck || 0) + "%"],
            ["MOVE SPEED", "+" + (bonuses.perLevelSpeed || 0) + "%"],
          ],
        },
      ];
      const gap = 16;
      const width = (rect.width - gap) / 2;
      groups.forEach((group, groupIndex) => {
        const x = rect.left + groupIndex * (width + gap);
        addSurface(x, bodyTop, width, bodyHeight, groupIndex === 0);
        createIconBadge(this, group.icon, {
          x: x + 54,
          y: bodyTop + 54,
          size: 66,
          iconSize: 54,
          selected: true,
          parent: tabContent,
        });
        addText(x + 100, bodyTop + 37, group.title, {
          fontFamily: UI_FONTS.display,
          fontSize: "20px",
          fontStyle: "bold",
          color: UI_COLORS.title,
        });
        addText(x + 100, bodyTop + 65, "PERMANENT AND EQUIPPED BONUSES", {
          fontFamily: UI_FONTS.mono,
          fontSize: "9px",
          color: UI_COLORS.gold,
        });
        group.rows.forEach((row, index) => {
          const rowY = bodyTop + 118 + index * 58;
          const card = this.add.rectangle(
            x + width / 2,
            rowY + 22,
            width - 32,
            46,
            UI_COLORS.bg,
            0.84
          ).setStrokeStyle(1, UI_COLORS.borderDim);
          tabContent.add(card);
          addText(x + 28, rowY + 22, row[0], {
            fontFamily: UI_FONTS.mono,
            fontSize: "10px",
            color: UI_COLORS.body,
          }, 0, 0.5);
          addText(x + width - 28, rowY + 22, String(row[1]), {
            fontFamily: UI_FONTS.display,
            fontSize: "17px",
            fontStyle: "bold",
            color: index === 0 ? UI_COLORS.gold : UI_COLORS.title,
          }, 1, 0.5);
        });
      });
    };

    const buildSettings = () => {
      state.settings = createSettingsPanelContent(this, {
        x: 0,
        y: bodyTop + bodyHeight / 2,
        width: rect.width,
        height: bodyHeight,
        parent: tabContent,
        depth: 2503,
        soundSystem: this.soundSystem,
        inputHandler: this.inputHandler,
        uiMuteToggle: this.uiMuteToggle,
        manageFocus: true,
        compact: rect.width < 760,
        onCancel: () => this.resumeGame(),
      });
    };

    const buildContent = tabIndex => {
      clearContent();
      state.activeTab = tabIndex;
      this._currentPauseTab = tabIndex;
      state.tabs?.setActive?.(tabIndex, true);
      if (tabIndex === 0) buildGeneral();
      else if (tabIndex === 1) buildStats();
      else buildSettings();
      state.focus?.setItems?.(state.controls, 0);
    };

    state.tabs = createTabBar(this, {
      x: rect.left + 235,
      y: rect.top + 20,
      tabs: [
        { label: "GENERAL", icon: "journal" },
        { label: "STATS", icon: "stats" },
        { label: "SETTINGS", icon: "settings" },
      ],
      activeIndex: 0,
      parent: shell.content,
      onChange: buildContent,
    });
    state.hint = createHintLegend(this, {
      x: 0,
      y: shell.height / 2 - 24,
      text: "WASD / Arrows: move    Enter / Space: select    ESC: resume",
      parent: shell.root,
    });
    state.focus = createFocusController(this, {
      items: [],
      enabled: () => Boolean(this._pausePanel) && !this._settingsKeyCaptureActive,
      onCancel: () => this.resumeGame(),
      onHorizontal: direction => {
        if (state.activeTab === 2) return;
        const next = (state.activeTab + direction + 3) % 3;
        state.tabs.setActive(next);
      },
    });

    this._pausePanel = { shell, state };
    buildContent(0);
    shell.show();
  };

  prototype.hidePauseMenu = function() {
    if (!this._pausePanel) return;
    const pause = this._pausePanel;
    this._pausePanel = null;
    pause.state?.focus?.destroy?.();
    pause.state?.settings?.destroy?.();
    pause.state?.tabs?.destroy?.();
    pause.state?.hint?.destroy?.();
    pause.shell?.hide?.(() => pause.shell?.destroy?.());
  };

  prototype.closeTopOverlay = function(reason = "escape") {
    if (this._settingsKeyCaptureActive) return false;

    if (this.depthGateSystem?.isOpen?.()) {
      this.depthGateSystem._decline?.();
      return true;
    }

    if (this.levelUpPopup?.visible) {
      if (this.levelUpPopup.pendingChoice) {
        this.hudSystem?.flashStatus?.("Choose a reward to continue", "#e4ba78", 1400);
        this.soundSystem?.playUiSelect?.();
      } else {
        this.levelUpPopup.clickedChoice = "continue";
        this.soundSystem?.playUiConfirm?.();
      }
      return true;
    }

    if (this.shopOverlay?.isVisible) {
      this.soundSystem?.playUiConfirm?.();
      this.shopOverlay.hide?.();
      return true;
    }

    if (this.campfireSystem?.isSelecting?.()) {
      this.campfireSystem._closeBuffSelection?.();
      return true;
    }

    if (this.milestoneBoardSystem?._isBoardOpen) {
      this.milestoneBoardSystem._closeBoardView?.();
      return true;
    }

    if (this._pillarViewActive && this.starPillarSystem) {
      this.starPillarSystem.closeConstellationView?.();
      return true;
    }

    if (this.uiInventoryPopup?.isOpen) {
      this.uiInventoryPopup.close?.();
      return true;
    }

    if (this._pausePanel || this.gameState === "paused") {
      this.resumeGame?.();
      return true;
    }

    return false;
  };

  prototype.saveGame = async function(labelObj) {
    if (labelObj) labelObj.setText('SAVING...');
    this.queueDugTilesSave();
    try {
      const saved = await this.flushDugTilesSave();
      this.hudSystem?.flashStatus(
        saved === false ? 'Save failed!' : 'Game saved!',
        saved === false ? '#ff6b6b' : '#2ecc71',
        2000
      );
    } catch (_) {
      this.hudSystem?.flashStatus('Save failed!', '#ff6b6b', 2000);
    } finally {
      if (labelObj) labelObj.setText('SAVE GAME');
    }
  };

  prototype.resumeGame = function() {
    this.gameState = "playing";
    this.hidePauseMenu();
    this.playerController.setControlsEnabled(true);
  };

  prototype._resetPlayerToSpawn = function() {
    const ts = this.config.tileSize;
    const spawnTx = Number.isFinite(this.config.playerSpawnTileX) ? this.config.playerSpawnTileX : this.config.spawnTileX;
    const spawnTy = Number.isFinite(this.config.playerSpawnTileY) ? this.config.playerSpawnTileY : this.config.spawnTileY;
    const spawnWx = spawnTx * ts + ts / 2;
    const spawnWy = (spawnTy + 1) * ts;
    if (this.playerController) {
      this.playerController.teleportToTile(spawnTx, spawnTy);
    } else if (this.player) {
      this.player.setPosition(spawnWx, spawnWy);
    }
  };

  prototype.returnToMainMenu = async function() {
    this.hidePauseMenu();
    this.gameState = "transitioning";
    this.queueDugTilesSave();
    const saved = await this.flushDugTilesSave();
    if (saved === false) {
      console.warn('[PlayScene] Save failed while returning to the main menu.');
    }
    this.scene.start("MainMenuScene");
  };

  prototype.unstuckPlayer = function() {
    this._resetPlayerToSpawn();
    this.earthquakeFeedbackUI?.clearEscapeObjective?.();
    this.earthquakeHazardOverlay?.clear?.();
    this.resumeGame();
    this.hudSystem.flashStatus("Unstuck — returned to spawn", "#9de3a1", UI_CONFIG.flashUnstuck);
  };

  prototype.enterTitleState = function() {
    this.gameState = "title";
    this.playerController.setControlsEnabled(false);
    this.isDigAnimating = false;
    this.aimBox.setVisible(false);
    this.hideOverlay();

    // Show XP progress bar
    this.xpProgressBar?.show();

    const welcome = this._generateWelcomeMessage();
    this.showOverlay(welcome.title, welcome.body);
    this.hudSystem.flashStatus(welcome.status, welcome.statusColor, UI_CONFIG.flashWelcome);
  };

  prototype.startRun = function() {
    this.gameState = "playing";
    this.hideOverlay();
    this.playerController.setControlsEnabled(true);
    this.activeImpactFx = 0;
    this.lastAimTileKey = "";
    this._lowGemPowerWarned = false;
    this._resetPlayerToSpawn();
    this.hudSystem.flashStatus("Run started", "#9de3a1", UI_CONFIG.flashRunStarted);

    // Show XP progress bar
    this.xpProgressBar?.show();

    if (this.soundSystem) {
      this.soundSystem.startAudioAfterUserGesture();
    }
  };

  prototype.enterDeathState = function(depth) {
    this.hidePauseMenu?.();
    if (this.gameState !== "playing") return;

    this.lightSystem?.forceTorchOff();
    this.gameState = "dead";
    this.playerController.setControlsEnabled(false);
    this.isDigAnimating = false;
    this.player.anims.stop();
    this.aimBox.setVisible(false);

    const resources = this.digSystem.getResourceTotals();
    const body = [
      `You reached crush depth at ${depth} tiles.`,
      `Broken: ${this.digSystem.getTilesBroken()}  Au:${resources.gold} Ag:${resources.silver} Fe:${resources.iron} Bn:${resources.bronze} St:${resources.steel} Cu:${resources.copper} Stn:${resources.stone} Dt:${resources.dirt}`,
      `Press ${USER_SETTINGS.getKeyLabel("restart")} to restart instantly.`,
    ].join("\n");

    this.showOverlay("Run Over", body);
    this.hudSystem.flashStatus("Run over", "#ff8a8a", UI_CONFIG.flashRunOver);
  };

  prototype.restartRun = function() {
    this.queueDugTilesSave();
    this.scene.restart({ autoStart: true });
  };

  prototype.applyPersistentState = function(savedData, showStatus) {
    if (!savedData) return;

    if (savedData.updatedAt && savedData.updatedAt === this.lastAppliedSaveUpdatedAt) {
      return;
    }

    const appliedTiles = this.worldModel.applyDugTileKeys(savedData.dugTiles ?? []);
    for (const tile of appliedTiles) {
      this.worldRenderer.applyTileUpdate(tile.tx, tile.ty);
    }

    const appliedRubbleTiles = this.worldModel.applyRubbleTiles(savedData.rubbleTiles ?? []);
    for (const tile of appliedRubbleTiles) {
      this.worldRenderer.applyTileUpdate(tile.tx, tile.ty);
    }

    this.digSystem.setResourceTotals(savedData.resources);
    this.uiResourceBar?.setResources(this.digSystem.getResourceTotals());
    this.caveEntryController?.applySaveData(savedData.caveSceneData);
    this.ancientRelicSystem?.loadSaveData(savedData.ancientRelicData);
    this.floatingTextSystem?.tryUnlockEligibleConstellations?.();

    // Restore paired teleporter data (sky island teleporter tiles)
    if (savedData.specialTileData && this.specialTileSystem) {
      this.specialTileSystem.loadSaveData(savedData.specialTileData);
    }

    if (this.retentionProgressSystem) {
      this.retentionProgressSystem.loadSaveData(savedData.retentionData);
      this.retentionProgressSystem.seedLegacyProgress({
        dugTileKeys: savedData.dugTiles,
        resources: savedData.resources,
        level: savedData.levelData?.level,
        relics: savedData.ancientRelicData?.count,
        stars: Object.values(this.floatingTextSystem?.getConstellationCounts?.() || {})
          .reduce((total, value) => total + Math.max(0, Number(value) || 0), 0),
        portals: this.specialTileSystem?.getActivatedPortals?.().map(portal => portal.label)
          || savedData.specialTileData?.portalOrder
          || [],
        topAirRows: savedData.world?.topAirRows ?? this.config.topAirRows,
      });
    }

    if (this.depthGateSystem) {
      this.depthGateSystem.loadSaveData(savedData.depthGateData);
    }

    if (savedData.upgrades) {
      this.upgradeSystem.fromJSON(savedData.upgrades);
    }
    this.surfaceTunnelDoorSystem?.syncFromUpgrade();

    // Restore day/night cycle state
    if (savedData.dayNightData && this.dayNightCycle) {
      this.dayNightCycle.fromJSON(savedData.dayNightData);
    }

    const resources = this.digSystem.getResourceTotals();
    if (showStatus && (appliedTiles.length > 0 || appliedRubbleTiles.length > 0 || resources.dirt > 0 || resources.stone > 0 || resources.copper > 0)) {
      this.hudSystem.flashStatus(
        `Loaded save: ${appliedTiles.length} dug, ${appliedRubbleTiles.length} rubble, Au:${resources.gold} Ag:${resources.silver} Fe:${resources.iron}`,
        "#9bc9ff",
        UI_CONFIG.flashLoadSave
      );
    }

    if (savedData.updatedAt) {
      this.lastAppliedSaveUpdatedAt = savedData.updatedAt;
    }
  };

  prototype.restorePersistentState = async function() {
    try {
      const worldIdentity = this.worldModel.getWorldIdentity();
      const savedData = await this.dugTileSaveStore.load(worldIdentity);
      this.applyPersistentState(savedData, true);
    } catch {
      // Silently continue if save restore fails.
    }
  };

  prototype.queueDugTilesSave = function() {
    this.pendingDugTileSave = true;

    if (this.savingDugTiles) {
      return this._dugTileSavePromise;
    }

    this.flushDugTilesSave();
  };

  prototype.flushDugTilesSave = async function() {
    if (!this.pendingDugTileSave) {
      return;
    }
    if (this.savingDugTiles) return this._dugTileSavePromise;

    this.pendingDugTileSave = false;
    this.savingDugTiles = true;
    let resolveInFlight;
    this._dugTileSavePromise = new Promise((resolve) => {
      resolveInFlight = resolve;
    });
    let saved = true;

    try {
      const worldIdentity = this.worldModel.getWorldIdentity();
      const dugTileKeys = this.worldModel.getDugTileKeys();
      const rubbleTiles = this.worldModel.getRubbleTiles();
      const resources = this.digSystem.getResourceTotals();
      const upgrades = this.upgradeSystem.toJSON();
      const levelData = this.playerLevelSystem ? this.playerLevelSystem.toJSON() : null;
      const specialTileData = this.specialTileSystem ? this.specialTileSystem.getSaveData() : null;
      const depthGateData = this.depthGateSystem ? this.depthGateSystem.getSaveData() : null;
      const dayNightData = this.dayNightCycle?.toJSON?.() ?? null;
      const saveResult = await this.dugTileSaveStore.save(
        worldIdentity,
        dugTileKeys,
        resources,
        upgrades,
        levelData,
        specialTileData,
        depthGateData,
        dayNightData,
        rubbleTiles,
        this.playerCharacterId,
        this.caveEntryController?.getSaveData(),
        this.ancientRelicSystem?.getSaveData(),
        this.retentionProgressSystem?.getSaveData(),
      );
      if (saveResult === false) saved = false;
    } catch (error) {
      saved = false;
      console.warn('[PlayScene] Save I/O failed:', error);
    } finally {
      this.savingDugTiles = false;
    }

    if (this.pendingDugTileSave) {
      const nextSaveSucceeded = await this.flushDugTilesSave();
      saved = saved && nextSaveSucceeded !== false;
    }
    resolveInFlight(saved);
    this._dugTileSavePromise = null;
    return saved;
  };

  prototype.resize = function() {
    this.xpProgressBar?.resize?.();
    this.levelUpPopup?.resize?.();
    this.uiInventoryPopup?.resize?.();
    this.nextPromiseHudSystem?.resize?.();
  };
}

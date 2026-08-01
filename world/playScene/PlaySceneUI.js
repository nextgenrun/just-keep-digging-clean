/**
 * PlayScene UI Module
 * Handles overlays, status bars, safe return line, and save/load functionality
 */

import { WelcomeMessageGenerator } from "../model/WelcomeMessageGenerator.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  PAUSE_MENU_LAYOUT,
  SETTINGS_PANEL_LAYOUT,
  UI_FONTS,
} from "../../values/uiLayout.js?rev=20260727-save-transfer-v1";
import { createIconBadge, createModalShell } from "../../ui/UiModalShell.js";
import {
  createButton,
  createFocusController,
  createHintLegend,
  createPanel,
  createTabBar,
} from "../../ui/PhaserUiKit.js";
import { createSettingsPanelContent } from "../../ui/overlays/SettingsPanelContent.js";
import { createSaveTransferPanelContent } from "../../ui/overlays/SaveTransferPanelContent.js";
import { createJourneyPanelContent } from "../../ui/overlays/JourneyView.js";
import { StarlightTalentTreeView } from "../../ui/overlays/StarlightTalentTreeView.js";
import { TitanArchiveView } from "../../ui/overlays/TitanArchiveView.js";
import { createPauseFeatureLoadingView } from
  "../../ui/components/PauseFeatureLoadingView.js";
import { WorldMapOverlay } from "../../ui/overlays/WorldMapOverlay.js";
import { UIMuteToggle } from "../../ui/hud/UIMuteToggle.js";
import { UIInventoryPopup } from "../../ui/overlays/UIInventoryPopup.js";
import { ShopOverlay } from "../../ui/overlays/ShopOverlay.js";
import { XPProgressBar } from "../../ui/hud/XPProgressBar.js";
import { LevelUpPopup } from "../../ui/overlays/LevelUpPopup.js";
import { UINotificationSystem } from "../../ui/UINotificationSystem.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import {
  isHardcoreMode,
  isHardcoreModeArmed,
} from "../../values/hardcoreMode.js";
import { resolveTitanDiscoveriesEnabled } from "../../values/titanDiscoveries.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from "../../values/starlightTalentTree.js";
import {
  RUNTIME_FEATURE_ASSET_CONSUMERS,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../../values/runtimeAssetLoading.js";
import { JOURNEY_CONFIG } from "../../values/journeyConfig.js";
import {
  getGraveborerWurmSaveData,
  loadGraveborerWurmSaveData,
} from "./GraveborerWurmBridge.js";
import {
  getHardcoreModeSaveData,
  loadHardcoreModeSaveData,
} from "./HardcoreModeBridge.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";

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

    this.uiNotifications ||= new UINotificationSystem(this);
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
    const flightLocked = this.openingFlightArtifactSystem
      ?.isArtifactCollected?.() !== true
      && this.upgradeSystem?.isGemPowerUnlocked?.() !== true;
    const gemPowerVisible = this.systemIntroductionSystem?.isFeatureAvailable?.("gemPower") ?? true;
    if (
      gemPowerPct === this._lastGemPowerBarPct &&
      gpRaw === this._lastGemPowerBarRaw &&
      gpMax === this._lastGemPowerBarMax &&
      flightLocked === this._lastGemPowerBarLocked &&
      gemPowerVisible === this._lastGemPowerBarVisible
    ) {
      return;
    }
    this._lastGemPowerBarPct = gemPowerPct;
    this._lastGemPowerBarRaw = gpRaw;
    this._lastGemPowerBarMax = gpMax;
    this._lastGemPowerBarLocked = flightLocked;

    this._lastGemPowerBarVisible = gemPowerVisible;
    this._gemPowerBarBg?.setVisible(gemPowerVisible);
    this._gemPowerBarFill?.setVisible(gemPowerVisible);
    this._gpLabelText?.setVisible(gemPowerVisible);
    if (!gemPowerVisible) return;
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
      this._gpLabelText.setText(
        flightLocked
          ? "FLIGHT UNLOCKS AFTER TRAINING"
          : approvedLayout
            ? `GP  ${gpRaw} / ${gpMax}`
            : `GP: ${gpRaw}/${gpMax}`,
      );
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
      `SAFE RETURN  •  ~${depth} tiles`
    );
  };

  prototype._generateWelcomeMessage = function() {
    const saveData = this._cachedSaveData;
    return WelcomeMessageGenerator.generateMessage(saveData);
  };

  // Unified pause menu implementation.
  prototype.showPauseMenu = function(options = {}) {
    if (this._pausePanel) return false;
    this.gameState = "paused";
    this.playerController.setControlsEnabled(false);
    this.openingFlightArtifactSystem?.view?.hideHud?.();

    const shell = createModalShell(this, {
      title: "PAUSED",
      subtitle: "Run controls, progression, and settings",
      icon: "pause",
      maxWidth: PAUSE_MENU_LAYOUT.maxWidth,
      maxHeight: PAUSE_MENU_LAYOUT.maxHeight,
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
      saveTransfer: null,
      journeyView: null,
      talentTree: null,
      titanArchive: null,
      activeFeatureGroup: null,
      activeFeatureConsumer: null,
      pendingFeatureGroup: null,
      pendingFeatureConsumer: null,
      featureRequestToken: 0,
      featureLoadingView: null,
      tabContent,
    };
    const systemFeatureAvailable = feature => this.systemIntroductionSystem?.isFeatureAvailable?.(feature) !== false;
    const pauseTabs = [
      { key: "general", label: "GENERAL", icon: "journal" },
      { key: "saves", label: "SAVES", icon: "journal" },
      ...(systemFeatureAvailable("journey") ? [{ key: "journey", label: JOURNEY_CONFIG.copy.tabLabel, icon: "stats" }] : []),
      ...(systemFeatureAvailable("constellations") ? [{ key: "talents", label: "TALENTS", icon: "constellation" }] : []),
      ...(resolveTitanDiscoveriesEnabled() && systemFeatureAvailable("titans")
        ? [{ key: "titans", label: "TITANS", icon: "journal" }]
        : []),
      { key: "settings", label: "SETTINGS", icon: "settings" },
    ];
    state.tabKeys = pauseTabs.map(tab => tab.key);
    const requestedTabKey = options.initialTabKey === "stats"
      ? "journey"
      : options.initialTabKey;
    const requestedInitialTab = pauseTabs.findIndex(
      tab => tab.key === requestedTabKey,
    );
    const initialTabIndex = requestedInitialTab >= 0 ? requestedInitialTab : 0;
    this._currentPauseTab = initialTabIndex;
    const settingsTabIndex = pauseTabs.findIndex(tab => tab.key === "settings");
    const featureGroupForTab = tabKey => {
      if (tabKey === "talents") return RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight;
      if (tabKey === "titans") return RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive;
      return null;
    };
    const featureConsumerForGroup = groupId => (
      groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight
        ? RUNTIME_FEATURE_ASSET_CONSUMERS.pauseStarlight
        : RUNTIME_FEATURE_ASSET_CONSUMERS.pauseTitanArchive
    );
    const featureThemeForGroup = groupId => (
      groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight
        ? "starlight"
        : "titanArchive"
    );
    const releaseActiveFeature = () => {
      if (!state.activeFeatureGroup) return;
      this.runtimeFeatureAssetManager?.releaseGroup?.(
        state.activeFeatureGroup,
        state.activeFeatureConsumer,
      );
      state.activeFeatureGroup = null;
      state.activeFeatureConsumer = null;
    };
    const cancelPendingFeature = () => {
      state.featureRequestToken += 1;
      if (state.pendingFeatureGroup) {
        this.runtimeFeatureAssetManager?.releaseGroup?.(
          state.pendingFeatureGroup,
          state.pendingFeatureConsumer,
        );
      }
      state.pendingFeatureGroup = null;
      state.pendingFeatureConsumer = null;
      state.featureLoadingView?.destroy?.();
      state.featureLoadingView = null;
    };
    state.releaseFeatureAssets = releaseActiveFeature;
    state.cancelFeatureRequest = cancelPendingFeature;


    const clearContent = () => {
      state.settings?.destroy?.();
      state.saveTransfer?.destroy?.();
      state.journeyView?.destroy?.();
      state.talentTree?.destroy?.();
      state.titanArchive?.destroy?.();
      state.featureLoadingView?.destroy?.();
      state.settings = null;
      state.saveTransfer = null;
      state.journeyView = null;
      state.talentTree = null;
      state.titanArchive = null;
      state.featureLoadingView = null;
      state.controls = [];
      releaseActiveFeature();
      tabContent.removeAll(true);
    };

    const setTalentImmersive = active => {
      const visible = !active;
      state.talentImmersive = Boolean(active);
      state.tabs?.root?.setVisible?.(visible);
      state.hint?.root?.setVisible?.(visible);
      shell.titleText?.setVisible?.(visible);
      shell.subtitleText?.setVisible?.(visible);
      shell.icon?.setVisible?.(visible);
      shell.closeButton?.root?.setVisible?.(visible);
      shell.skin?.setVisible?.(visible);
      shell.panel?.setVisible?.(visible && !shell.skin);
    };
    state.setTalentImmersive = setTalentImmersive;

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

    const bodyTop = rect.top + PAUSE_MENU_LAYOUT.bodyTopOffset;
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
      const quickResumeCost = deepestPortal
        ? this.getHardcoreTeleportCost?.({
            depth: deepestPortal.depth,
            kind: "quickResume",
          }) || 0
        : 0;
      const definitions = [
        { label: "RESUME GAME", icon: "play", accent: UI_COLORS.borderSel, action: () => this.resumeGame() },
        ...(systemFeatureAvailable("specialTiles") && deepestPortal ? [{
          label: `QUICK RESUME  •  L${deepestPortal.levelId} ${deepestPortal.depth}m`
            + (quickResumeCost > 0 ? `  •  ${quickResumeCost.toLocaleString()} M` : ""),
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
      const relicCount = this.ancientRelicSystem?.getCount?.() || 0;
      const titanCount = this.retentionProgressSystem?.getDiscoveredTitans?.().length || 0;

      const snapshot = [
        ["DEPTH", depth + "m"],
        ["PLAYER LEVEL", level],
        ["WALLET", Number(wallet).toLocaleString() + " M"],
        ...(systemFeatureAvailable("gemPower") ? [["GEM POWER", Math.floor(gp) + " / " + Math.floor(gpMax)]] : []),
        ["MATERIALS", Math.floor(materials).toLocaleString()],
        ...(systemFeatureAvailable("relics") ? [["ANCIENT RELICS", relicCount]] : []),
        ...(systemFeatureAvailable("titans") ? [["TITANS", titanCount + " / 25"]] : []),
        ...(systemFeatureAvailable("campfire") ? [["CAMPFIRE", buff ? buff.name.toUpperCase() : "NO ACTIVE BUFF"]] : []),
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

    const buildSaves = () => {
      state.saveTransfer = createSaveTransferPanelContent(this, {
        x: rect.left,
        y: bodyTop,
        width: rect.width,
        height: bodyHeight,
        parent: tabContent,
        slotId: this.saveSlot,
        allowExport: !isHardcoreMode(getHardcoreModeSaveData(this)),
        exportDisabledReason: "OATH LOCKED",
        onFocus: index => state.focus?.setIndex?.(index),
        onSave: async () => {
          const saved = await this.saveGame();
          return {
            success: saved,
            message: saved ? "Current progress saved." : "Save failed. Nothing was exported.",
          };
        },
        onExport: async () => {
          const saved = await this.saveGame();
          if (!saved) {
            return { success: false, message: "Save failed. Export was cancelled." };
          }
          const exported = this.dugTileSaveStore?.exportSave();
          return {
            success: Boolean(exported),
            message: exported
              ? `Save slot ${this.saveSlot} downloaded as JSON.`
              : "No save data was available to export.",
          };
        },
        onImport: async file => {
          const saved = await this.saveGame();
          if (!saved) {
            return { success: false, message: "Current progress could not be secured. Import cancelled." };
          }
          const result = await this.dugTileSaveStore?.importSave(file);
          if (!result?.success) {
            return { success: false, message: result?.error || "The selected file is not a valid save." };
          }

          const saveSlot = this.saveSlot || 1;
          const playerCharacterId = result.saveData?.playerCharacterId || this.playerCharacterId;
          this.hidePauseMenu();
          this.gameState = "transitioning";
          this.scene.start("WorldLoadScene", {
            saveSlot,
            worldIdentity: `save-slot-${saveSlot}`,
            playerCharacterId,
          });
          return { success: true, message: "Import complete. Reloading the selected slot..." };
        },
      });
      state.controls = state.saveTransfer.getControls();
    };

    const buildJourney = () => {
      state.journeyView = createJourneyPanelContent(this, {
        x: rect.left,
        y: bodyTop,
        width: rect.width,
        height: bodyHeight,
        parent: tabContent,
        journeySystem: this.journeySystem,
      });
      state.controls = [];
    };

    const buildTalents = () => {
      setTalentImmersive(true);
      const inset = STARLIGHT_TALENT_TREE_CONFIG.layout.immersiveInsetPx;
      state.talentTree = new StarlightTalentTreeView(this, {
        x: -shell.width / 2 + inset,
        y: -shell.height / 2 + inset,
        width: shell.width - inset * 2,
        height: shell.height - inset * 2,
        parent: tabContent,
        floatingTextSystem: this.floatingTextSystem,
        progression: this.starHeartProgressionSystem,
        abilities: this.playerController?.abilities,
        mode: "pause",
        focusResource: options.focusResource,
        firstRevealResource: options.firstReveal ? options.focusResource : null,
        onFocus: index => state.focus?.setIndex?.(index),
        onPauseMenu: () => state.tabs?.setActive?.(0),
        onEngineAction: () => {
          this.hudSystem?.flashStatus?.(
            STARLIGHT_TALENT_TREE_CONFIG.copy.pillarOnly,
            "#D6A84A",
            2200,
          );
          this.soundSystem?.playUiSelect?.();
        },
      });
      state.controls = state.talentTree.getControls();
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
        compact: (
          rect.width < SETTINGS_PANEL_LAYOUT.compactWidth
          || bodyHeight < SETTINGS_PANEL_LAYOUT.compactHeight
        ),
        onCancel: () => this.resumeGame(),
      });
    };

    const buildTitans = () => {
      state.titanArchive = new TitanArchiveView(this, {
        x: rect.left,
        y: bodyTop,
        width: rect.width,
        height: bodyHeight,
        parent: tabContent,
        retention: this.retentionProgressSystem,
        chamberProvider: this.worldRenderer?.getTitanArchiveAssetProvider?.(),
        clueSystem: this.titanClueSystem,
        clueDirectionProvider: this.worldRenderer?.getTitanClueDirectionProvider?.(),
        getPlayerTile: () => this.playerController?.getPlayerTile?.(),
        onFocus: index => state.focus?.setIndex?.(index),
      });
      state.controls = state.titanArchive.getControls();
    };

    const buildContent = (tabIndex, { assetsRetained = false } = {}) => {
      cancelPendingFeature();
      const tabKey = pauseTabs[tabIndex]?.key;
      const groupId = featureGroupForTab(tabKey);
      const manager = this.runtimeFeatureAssetManager;
      const consumer = groupId ? featureConsumerForGroup(groupId) : null;

      if (groupId && manager?.enabled && !assetsRetained && !manager.isReady(groupId)) {
        clearContent();
        setTalentImmersive(false);
        state.activeTab = tabIndex;
        this._currentPauseTab = tabIndex;
        state.tabs?.setActive?.(tabIndex, true);
        state.pendingFeatureGroup = groupId;
        state.pendingFeatureConsumer = consumer;
        const requestToken = state.featureRequestToken;
        const groupRequest = manager.ensureGroup(groupId, { consumer });
        state.featureLoadingView = createPauseFeatureLoadingView(this, {
          x: rect.left,
          y: bodyTop,
          width: rect.width,
          height: bodyHeight,
          parent: tabContent,
          themeId: featureThemeForGroup(groupId),
          getProgress: () => manager.getGroupProgress(groupId),
        });
        if (!state.featureLoadingView) {
          console.error(
            `[PauseFeatureLoading] Required authored loader art is unavailable for ${groupId}`,
          );
        }
        state.focus?.setItems?.([]);
        groupRequest.then(result => {
          const stillCurrent = this._pausePanel?.state === state
            && state.featureRequestToken === requestToken
            && state.pendingFeatureGroup === groupId;
          if (!stillCurrent) {
            manager.releaseGroup(groupId, consumer);
            return;
          }
          if (!result.ready) {
            state.pendingFeatureGroup = null;
            state.pendingFeatureConsumer = null;
            manager.releaseGroup(groupId, consumer);
            this.hudSystem?.flashStatus?.(
              "Feature art could not be loaded",
              "#E07030",
              1800,
            );
            buildContent(0);
            return;
          }
          const openLoadedFeature = () => {
            const stillReady = this._pausePanel?.state === state
              && state.featureRequestToken === requestToken
              && state.pendingFeatureGroup === groupId;
            if (!stillReady) {
              manager.releaseGroup(groupId, consumer);
              return;
            }
            state.pendingFeatureGroup = null;
            state.pendingFeatureConsumer = null;
            buildContent(tabIndex, { assetsRetained: true });
          };
          if (state.featureLoadingView) {
            state.featureLoadingView.complete(openLoadedFeature);
          } else {
            openLoadedFeature();
          }
        });
        return;
      }

      clearContent();
      setTalentImmersive(false);
      if (groupId && manager?.enabled) {
        if (!assetsRetained) manager.ensureGroup(groupId, { consumer });
        state.activeFeatureGroup = groupId;
        state.activeFeatureConsumer = consumer;
      }
      state.activeTab = tabIndex;
      this._currentPauseTab = tabIndex;
      state.tabs?.setActive?.(tabIndex, true);
      if (tabKey === "general") buildGeneral();
      else if (tabKey === "saves") buildSaves();
      else if (tabKey === "journey") buildJourney();
      else if (tabKey === "talents") buildTalents();
      else if (tabKey === "titans") buildTitans();
      else buildSettings();
      state.focus?.setItems?.(
        state.controls,
        state.titanArchive?.selectedIndex
          ?? state.talentTree?.selectedControlIndex
          ?? 0
      );
    };

    const pauseTabButtonWidth = Math.max(
      PAUSE_MENU_LAYOUT.tabButtonMinWidth,
      Math.min(
        PAUSE_MENU_LAYOUT.tabButtonMaxWidth,
        (
          rect.width
          - PAUSE_MENU_LAYOUT.tabGap * (pauseTabs.length - 1)
        ) / pauseTabs.length,
      ),
    );
    state.tabs = createTabBar(this, {
      x: 0,
      y: rect.top + PAUSE_MENU_LAYOUT.tabRowOffsetY,
      tabs: pauseTabs,
      activeIndex: initialTabIndex,
      spacing: pauseTabButtonWidth + PAUSE_MENU_LAYOUT.tabGap,
      buttonWidth: pauseTabButtonWidth,
      fontSize: pauseTabButtonWidth < 72 ? "10px" : "12px",
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
      onFocus: index => {
        state.titanArchive?.selectControl?.(index);
        state.talentTree?.selectControl?.(index);
      },
      onVertical: direction => {
        if (pauseTabs[state.activeTab]?.key !== "talents") return false;
        const next = state.talentTree?.moveSelection?.(0, direction);
        if (Number.isFinite(next)) state.focus?.setIndex?.(next);
        return true;
      },
      onHorizontal: direction => {
        if (state.activeTab === settingsTabIndex) return;
        if (pauseTabs[state.activeTab]?.key === "talents") {
          const next = state.talentTree?.moveSelection?.(direction, 0);
          if (Number.isFinite(next)) state.focus?.setIndex?.(next);
          return;
        }
        const next = (
          state.activeTab + direction + pauseTabs.length
        ) % pauseTabs.length;
        state.tabs.setActive(next);
      },
    });

    this._pausePanel = { shell, state };
    buildContent(initialTabIndex);
    shell.show();
    return true;
  };

  prototype.hidePauseMenu = function() {
    if (!this._pausePanel) return;
    const pause = this._pausePanel;
    this._pausePanel = null;
    pause.state?.cancelFeatureRequest?.();
    pause.state?.focus?.destroy?.();
    pause.state?.settings?.destroy?.();
    pause.state?.saveTransfer?.destroy?.();
    pause.state?.journeyView?.destroy?.();
    pause.state?.talentTree?.destroy?.();
    pause.state?.titanArchive?.destroy?.();
    pause.state?.releaseFeatureAssets?.();
    pause.state?.tabs?.destroy?.();
    pause.state?.hint?.destroy?.();
    pause.shell?.hide?.(() => pause.shell?.destroy?.());
  };

  prototype.showWorldMap = function() {
    if (this.worldMapOverlay?.isOpen || this._worldMapFeatureLoading || this.gameState !== "playing") return false;
    if (this.systemIntroductionSystem && !this.systemIntroductionSystem.isFeatureAvailable("map")) return false;
    const manager = this.runtimeFeatureAssetManager;
    const groupId = RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap;
    const consumer = RUNTIME_FEATURE_ASSET_CONSUMERS.worldMap;

    if (manager?.enabled && !manager.isReady(groupId)) {
      this._worldMapFeatureLoading = true;
      const requestId = (this._worldMapFeatureRequestId || 0) + 1;
      this._worldMapFeatureRequestId = requestId;
      manager.ensureGroup(groupId, { consumer }).then(result => {
        if (this._worldMapFeatureRequestId !== requestId) {
          manager.releaseGroup(groupId, consumer);
          return;
        }
        this._worldMapFeatureLoading = false;
        if (!result.ready || this.gameState !== "playing") {
          manager.releaseGroup(groupId, consumer);
          return;
        }
        this.showWorldMap();
      });
      return true;
    }

    if (manager?.enabled) manager.ensureGroup(groupId, { consumer });
    if (!this.worldMapOverlay) {
      this.worldMapOverlay = new WorldMapOverlay(this, {
        discoverySystem: this.worldMapDiscoverySystem,
        activityRegistry: this.worldMapActivityRegistry,
      });
    }
    const opened = this.worldMapOverlay.open();
    if (!opened) manager?.releaseGroup?.(groupId, consumer);
    return opened;
  };

  prototype.hideWorldMap = function() {
    const manager = this.runtimeFeatureAssetManager;
    const groupId = RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap;
    const consumer = RUNTIME_FEATURE_ASSET_CONSUMERS.worldMap;
    const wasLoading = this._worldMapFeatureLoading === true;
    if (wasLoading) {
      this._worldMapFeatureLoading = false;
      this._worldMapFeatureRequestId = (this._worldMapFeatureRequestId || 0) + 1;
    }
    const overlay = this.worldMapOverlay;
    const closed = overlay?.close?.() || false;
    overlay?.destroy?.();
    if (overlay) this.worldMapOverlay = null;
    manager?.releaseGroup?.(groupId, consumer);
    return closed || wasLoading;
  };

  prototype.toggleWorldMap = function() {
    if (this._worldMapFeatureLoading) return this.hideWorldMap();
    return this.worldMapOverlay?.isOpen
      ? this.hideWorldMap()
      : this.showWorldMap();
  };

  prototype.hasEscapeClosableUi = function() {
    return hasEscapeClosableUi(this);
  };

  prototype.closeTopOverlay = function(reason = "escape") {
    if (this._settingsKeyCaptureActive) return false;

    if (this._hardcoreRuntime?.modal?.isVisible) {
      this._hardcoreRuntime.modal.close?.({ cancelled: reason === "escape" });
      return true;
    }

    if (this.worldMapOverlay?.isOpen) {
      this.hideWorldMap();
      return true;
    }

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

    if (this.starHeartOverlay?.isOpen?.()) {
      this.starHeartOverlay.close?.();
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

    if (
      this.gameState === "dialog"
      && this.overlayManager?.shell?.root?.visible
    ) {
      this.hideOverlay?.();
      this.gameState = "playing";
      this.playerController?.setControlsEnabled?.(true);
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
    let saved = false;
    try {
      saved = await this.flushDugTilesSave();
      if (saved === false) {
        this.hudSystem?.flashStatus('Save failed!', '#ff6b6b', 2000);
      }
    } catch (_) {
      this.hudSystem?.flashStatus('Save failed!', '#ff6b6b', 2000);
    } finally {
      if (labelObj) labelObj.setText('SAVE GAME');
    }
    return saved !== false;
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
    return this.requestHardcoreUnstuck?.() ?? false;
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
  };

  prototype.startRun = function() {
    this.gameState = "playing";
    this.hideOverlay();
    this.playerController.setControlsEnabled(true);
    this.activeImpactFx = 0;
    this.lastAimTileKey = "";
    this._lowGemPowerWarned = false;
    if (this._restoredPlayerPosition) {
      this._restoredPlayerPosition = false;
    } else {
      this._resetPlayerToSpawn();
    }
    // Show XP progress bar
    this.xpProgressBar?.show();

    if (this.soundSystem) {
      this.soundSystem.startAudioAfterUserGesture();
    }
  };

  prototype.enterDeathState = function(depth) {
    return this.handleCasualBoundaryRescue?.(depth) ?? false;
  };

  prototype.restartRun = async function() {
    if (this._hardcoreDeathInProgress) return false;
    this.gameState = "transitioning";
    this.playerController?.setControlsEnabled?.(false);
    this.queueDugTilesSave();
    const saved = await this.flushDugTilesSave();
    if (saved === false) {
      this.gameState = "playing";
      this.playerController?.setControlsEnabled?.(true);
      this.hudSystem?.flashStatus?.("Restart blocked • current position was not saved", UI_COLORS.danger, UI_CONFIG.flashRunOver);
      return false;
    }
    this.scene.restart({
      autoStart: true,
      saveSlot: this.saveSlot,
      worldIdentity: this.worldIdentity,
      playerCharacterId: this.playerCharacterId,
      hardcoreModeData: getHardcoreModeSaveData(this),
    });
    return true;
  };

  prototype.applyPersistentState = function(savedData, _showStatus) {
    if (!savedData) return;

    if (savedData.updatedAt && savedData.updatedAt === this.lastAppliedSaveUpdatedAt) {
      return;
    }

    loadHardcoreModeSaveData(this, savedData.hardcoreModeData);
    loadGraveborerWurmSaveData(this, savedData.graveborerWurmData);

    const appliedTiles = this.worldModel.applyDugTileKeys(savedData.dugTiles ?? []);
    this.worldModel.applyHeavenblocksLayout?.();
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
    const recoveredRelicTiles = this.worldModel.ensureAncientRelicMilestoneReachable?.(
      this.ancientRelicSystem?.getCount?.() || 0,
    ) || [];
    for (const tile of recoveredRelicTiles) {
      this.worldRenderer.applyTileUpdate(tile.tx, tile.ty);
    }
    this.heavenblocksProgressionSystem?.loadSaveData?.(savedData.heavenblocksData, {
      relicCount: this.ancientRelicSystem?.getCount?.() || 0,
    });
    this.starHeartProgressionSystem?.loadSaveData(
      savedData.starHeartData,
      this.floatingTextSystem?.getUnlockedConstellations?.().length || 0,
    );
    this.floatingTextSystem?.tryUnlockEligibleConstellations?.();

    // Restore paired teleporter data (sky island teleporter tiles)
    if (savedData.specialTileData && this.specialTileSystem) {
      this.specialTileSystem.loadSaveData(savedData.specialTileData);
    }
    this.randomEventBridge?.loadSaveData?.(savedData.specialTileData?.randomWorldEvents);

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
    this.systemIntroductionSystem?.refresh({ announce: false });
      this.depthGateSystem.loadSaveData(savedData.depthGateData);
    }
    if (savedData.campfireData) {
      this.campfireSystem?.loadSaveData?.(savedData.campfireData);
    }

    if (savedData.upgrades) {
      this.upgradeSystem.fromJSON(savedData.upgrades);
    }
    this.openingFlightArtifactSystem?.loadSaveData(savedData.openingFlightArtifactData);
    this.surfaceTunnelDoorSystem?.syncFromUpgrade();

    const levelGpBonus = this.playerLevelSystem?.getGemPowerMaxBonus?.() ?? 0;
    const milestoneGpBonus = this.milestoneBoardSystem?.getBonuses?.()?.gpMaxBonus ?? 0;
    this.playerController?.setProgressionGemPowerMaxBonus?.(
      levelGpBonus + milestoneGpBonus,
    );
    if (savedData.playerStateData) {
      this._restoredPlayerPosition = this.playerController?.restorePersistenceData?.(
        savedData.playerStateData,
      ) === true;
    } else if (isHardcoreModeArmed(getHardcoreModeSaveData(this))) {
      // Schema v12 and older never stored GP. Give an armed legacy save a safe,
      // one-time full charge instead of interpreting missing data as 0 GP death.
      this.playerController?.fillGemPower?.();
    }

    // Restore day/night cycle state
    if (savedData.dayNightData && this.dayNightCycle) {
      this.dayNightCycle.fromJSON(savedData.dayNightData);
    }
    this.journeySystem?.loadSaveData?.(savedData.journeyData);
    this.journeySystem?.seedCurrentState?.();

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
    if (this._saveWritesBlocked || this._hardcoreDeathInProgress) return false;
    this.pendingDugTileSave = true;

    if (this.savingDugTiles) {
      return this._dugTileSavePromise;
    }
    if (this._saveScheduler?.schedule?.()) return true;
    return this.flushDugTilesSave({ scheduled: false });
  };

  prototype.flushDugTilesSave = async function({ scheduled = false, force = false } = {}) {
    if (this._saveWritesBlocked || this._hardcoreDeathInProgress) {
      this.pendingDugTileSave = false;
      return false;
    }
    if (!scheduled) this._saveScheduler?.cancelPending?.();
    if (!this.pendingDugTileSave) return;
    if (this.savingDugTiles) {
      if (!scheduled || force) this._forceNextDugTileSave = true;
      return this._dugTileSavePromise;
    }

    this.pendingDugTileSave = false;
    this.savingDugTiles = true;
    let resolveInFlight;
    this._dugTileSavePromise = new Promise((resolve) => {
      resolveInFlight = resolve;
    });
    const now = () => globalThis.performance?.now?.() ?? Date.now();
    const totalStartedAtMs = now();
    let captureMs = 0;
    let writeMs = 0;
    let writeStartedAtMs = null;
    let saved = true;

    try {
      const captureStartedAtMs = now();
      const worldIdentity = this.worldModel.getWorldIdentity();
      const dugTileKeys = this.worldModel.getDugTileKeys();
      const rubbleTiles = this.worldModel.getRubbleTiles();
      const resources = this.digSystem.getResourceTotals();
      const upgrades = this.upgradeSystem.toJSON();
      const levelData = this.playerLevelSystem?.toJSON?.() ?? null;
      const baseSpecialTileData = this.specialTileSystem?.getSaveData?.() ?? null;
      const specialTileData = baseSpecialTileData ? {
        ...baseSpecialTileData,
        randomWorldEvents: this.randomEventBridge?.getSaveData?.() ?? null,
      } : null;
      const depthGateData = this.depthGateSystem?.getSaveData?.() ?? null;
      const dayNightData = this.dayNightCycle?.toJSON?.() ?? null;
      const caveSceneData = this.caveEntryController?.getSaveData?.();
      const ancientRelicData = this.ancientRelicSystem?.getSaveData?.();
      const openingFlightData = this.openingFlightArtifactSystem?.getSaveData?.();
      const starHeartData = this.starHeartProgressionSystem?.getSaveData?.();
      const retentionData = this.retentionProgressSystem?.getSaveData?.();
      const heavenblocksData = this.heavenblocksProgressionSystem?.getSaveData?.();
      const hardcoreModeData = getHardcoreModeSaveData(this);
      const graveborerWurmData = getGraveborerWurmSaveData(this);
      const playerStateData = this.playerController?.getPersistenceData?.();
      const campfireData = this.campfireSystem?.getSaveData?.();
      const journeyData = this.journeySystem?.getSaveData?.();
      captureMs = Math.max(0, now() - captureStartedAtMs);

      writeStartedAtMs = now();
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
        caveSceneData,
        ancientRelicData,
        openingFlightData,
        starHeartData,
        retentionData,
        heavenblocksData,
        hardcoreModeData,
        graveborerWurmData,
        playerStateData,
        campfireData,
        journeyData,
      );
      writeMs = Math.max(0, now() - writeStartedAtMs);
      if (saveResult === false) saved = false;
    } catch (error) {
      if (writeStartedAtMs !== null) writeMs = Math.max(0, now() - writeStartedAtMs);
      saved = false;
      console.warn('[PlayScene] Save I/O failed:', error);
    } finally {
      this._saveScheduler?.recordTiming?.({
        captureMs,
        writeMs,
        totalMs: Math.max(0, now() - totalStartedAtMs),
      });
      this.savingDugTiles = false;
    }

    const forceNext = this._forceNextDugTileSave === true;
    this._forceNextDugTileSave = false;
    if (this.pendingDugTileSave) {
      if (scheduled && !forceNext && this._saveScheduler && !this._saveScheduler.destroyed) {
        this._saveScheduler.schedule();
      } else {
        const nextSaveSucceeded = await this.flushDugTilesSave({
          scheduled: false,
          force: forceNext,
        });
        saved = saved && nextSaveSucceeded !== false;
      }
    }
    resolveInFlight(saved);
    this._dugTileSavePromise = null;
    return saved;
  };

  prototype.resize = function() {
    this.uiNotifications?.resize?.();
    this.xpProgressBar?.resize?.();
    this.levelUpPopup?.resize?.();
    this.uiInventoryPopup?.resize?.();
    this.nextPromiseHudSystem?.resize?.();
    this.randomEventBridge?.resize?.();
    this.townSquareTutorialSystem?.resize?.();
    this.celestialEngineController?.resize?.();
    this.starHeartOverlay?.resize?.();
  };
}

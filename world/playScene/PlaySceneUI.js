/**
 * PlayScene UI Module
 * Handles overlays, status bars, safe return line, and save/load functionality
 */

import { TOWN_REST } from '../../values/townRest.js';
import { WelcomeMessageGenerator } from "../model/WelcomeMessageGenerator.js";
import { UI_CONFIG } from "../../values/uiConfig.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  PAUSE_MENU_LAYOUT,
  SETTINGS_PANEL_LAYOUT,
  UI_FONTS,
} from "../../values/uiLayout.js?rev=20260727-save-transfer-v1";
import { USER_SETTINGS } from "../../systems/UserSettings.js";
import { CelestialActionBarSystem } from
  "../../systems/visual/CelestialActionBarSystem.js";
import { CelestialActionBarInputBridge } from
  "../../systems/visual/CelestialActionBarInputBridge.js";
import { CelestialCurrencyHudSystem } from
  "../../systems/visual/CelestialCurrencyHudSystem.js";
import { LevelUpRewardPresentation } from
  "../../systems/visual/LevelUpRewardPresentation.js";
import {
  activateCelestialActionBarEntry,
  getCelestialActionBarAbilityState,
  getCelestialActionBarMetrics,
  presentAbilityBlockChoiceEvent,
} from "./CelestialActionBarRuntime.js";
import {
  applyCelestialOverhaulState,
} from "./CelestialOverhaulRuntime.js";
import {
  isHardcoreMode,
  isHardcoreModeArmed,
} from "../../values/hardcoreMode.js";
import { resolveTitanDiscoveriesEnabled } from "../../values/titanDiscoveries.js";
import {
  RUNTIME_FEATURE_ASSET_CONSUMERS,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../../values/runtimeAssetLoading.js";
import { JOURNEY_CONFIG } from "../../values/journeyConfig.js";
import { addBakedUiCaption, getBakedPauseStat, fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";
import { PLAYER_HINT_CONFIG } from "../../values/playerHints.js";
import { BAKED_UI_ART } from "../../values/bakedUiArt.js";
import { PAUSE_MENU_COPY } from "../../values/playerFacingCopy.js";
import { SCENE_BASE_PHASES, SCENE_SUSPENSION_KINDS } from "../../values/sceneRuntime.js";
import { SAVE_SCHEDULING_CONFIG } from "../../values/saveScheduling.js";
import {
  loadGraveborerWurmSaveData,
} from "./GraveborerWurmBridge.js";
import {
  getHardcoreModeSaveData,
  loadHardcoreModeSaveData,
} from "./HardcoreModeBridge.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";
import { enterSceneBasePhase, releaseSceneSuspension } from "./SceneModeBridge.js";

export async function awaitBoundedMainMenuSave(
  saveOperation,
  timeoutMs = SAVE_SCHEDULING_CONFIG.mainMenuFlushTimeoutMs,
) {
  const limit = Math.max(0, Number(timeoutMs) || 0);
  let timeoutId = null;
  const settled = Promise.resolve(saveOperation).then(
    value => ({ timedOut: false, value }),
    error => ({ timedOut: false, error }),
  );
  const timeout = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve({ timedOut: true, value: false }), limit);
  });
  const outcome = await Promise.race([settled, timeout]);
  if (timeoutId !== null) clearTimeout(timeoutId);
  if ("error" in outcome) throw outcome.error;
  return outcome;
}

/**
 * Mix in UI methods to PlayScene prototype
 */
export function setupUIMethods(prototype, dependencies) {
  const { createButton, createFocusController, createHintLegend, createIconBadge,
    createCelestialTalentTreeView, createJourneyPanelContent, createHintsPanelContent, createModalShell, createPanel,
    createPauseFeatureLoadingView,
    createSaveTransferPanelContent, createSettingsPanelContent, createTabBar, ShopOverlay,
    TitanArchiveView, UIMuteToggle, UINotificationSystem, UIInventoryPopup, WorldMapOverlay,
    XPProgressBar } = dependencies;
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
    this.levelUpRewardPresentation = new LevelUpRewardPresentation(this);
    this.celestialCurrencyHudSystem = new CelestialCurrencyHudSystem(this, {
      getMoney: () => this.upgradeSystem?.getMoney?.() || 0,
      getStars: () => (
        this.celestialTalentProgressionSystem?.getSnapshot?.()?.stars || 0
      ),
    });
    this.celestialActionBarSystem = new CelestialActionBarSystem(this, {
      loadoutProvider: {
        getLoadout: () => this._celestialActionBarOrder,
        setLoadout: order => {
          this._celestialActionBarOrder = [...order];
          this.queueDugTilesSave?.();
          return true;
        },
      },
      getAbilityState: entryId => (
        getCelestialActionBarAbilityState(this, entryId)
      ),
      getMetrics: () => getCelestialActionBarMetrics(this),
      onActivate: entryId => activateCelestialActionBarEntry(this, entryId),
      onBlockedActivate: (_entryId, detail) => {
        const state = detail?.state;
        this.hudSystem?.flashStatus?.(
          state?.unlocked ? state.unavailableReason : state?.unlockCondition,
          "#AFC4D2",
          1700,
        );
      },
    });
    this.specialBlockEffectsManager?.setAbilityChoiceListener?.(
      event => presentAbilityBlockChoiceEvent(this, event),
    );
    this.celestialActionBarInputBridge = new CelestialActionBarInputBridge(
      this,
      this.celestialActionBarSystem,
      {
        isEnabled: () => this.gameState === "playing"
          && !hasEscapeClosableUi(this)
          && !this.campfireSystem?.isSelecting?.(),
      },
    );
  };

  prototype.destroySceneUI = function() {
    if (!this._sceneUIInitialized) return;
    this._sceneUIInitialized = false;

    this.uiNotifications?.destroy();
    this.uiMuteToggle?.destroy();
    this.uiInventoryPopup?.destroy();
    this.shopOverlay?.destroy();
    this.xpProgressBar?.destroy();
    this.levelUpRewardPresentation?.destroy();
    this.celestialActionBarInputBridge?.destroy();
    this.celestialActionBarSystem?.destroy();
    this.celestialCurrencyHudSystem?.destroy();

    this.uiNotifications = null;
    this.uiMuteToggle = null;
    this.uiInventoryPopup = null;
    this.shopOverlay = null;
    this.xpProgressBar = null;
    this.levelUpRewardPresentation = null;
    this.celestialActionBarInputBridge = null;
    this.celestialActionBarSystem = null;
    this.celestialCurrencyHudSystem = null;
    releaseSceneSuspension(this, "_dialogSuspension");
    releaseSceneSuspension(this, "_pauseSuspension");
  };

  prototype.showOverlay = function(title, body) {
    this.overlayManager.showOverlay(title, body);
  };

  prototype.hideOverlay = function() {
    this.overlayManager.hideOverlay();
  };

  prototype.closeGameDialog = function() {
    releaseSceneSuspension(this, "_dialogSuspension");
    this.playerController?.setControlsEnabled?.(this.sceneModeController.isGameplayActive);
  };

  prototype.showGameDialog = function(title, body) {
    this._dialogSuspension ||= this.acquireSceneSuspension(
      SCENE_SUSPENSION_KINDS.DIALOG,
      "game-dialog",
    );
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
            ? `${gpRaw} / ${gpMax}`
            : `GP: ${gpRaw}/${gpMax}`,
      );
      if (approvedLayout) fitLiveUiText(this._gpLabelText, approvedLayout.width);
    }
  };

  prototype._calcSafeReturnDepth = function() {
    const maxFlyTiles = this.playerController?.abilities?.getMaxFlightHeightTiles?.();
    const fallbackTiles = this.config.safeReturnDepthTiles ?? 3;
    const depthTiles = Number.isFinite(maxFlyTiles) ? Math.floor(maxFlyTiles) : fallbackTiles;
    return Math.max(2, Math.min(depthTiles, this.config.flightWarningDepthTiles - 1));
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
    if (this._pausePanel || this.townRestSystem?.isActive()) return false;
    this.soundSystem?._suspendAudio?.();
    this.soundSystem?.playMenuOpen?.();
    this._pauseSuspension ||= this.acquireSceneSuspension(
      SCENE_SUSPENSION_KINDS.PAUSE,
      "pause-menu",
    );
    this.playerController.setControlsEnabled(false);
    this.openingFlightArtifactSystem?.view?.hideHud?.();

    const shell = createModalShell(this, {
      title: PAUSE_MENU_COPY.title,
      subtitle: PAUSE_MENU_COPY.subtitle,
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
      hintsView: null,
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
      { key: "hints", label: PLAYER_HINT_CONFIG.copy.tab, skinKey: PLAYER_HINT_CONFIG.skinKey },
      ...(systemFeatureAvailable("journey") ? [{ key: "journey", label: JOURNEY_CONFIG.copy.tabLabel, icon: "stats" }] : []),
      ...(resolveTitanDiscoveriesEnabled()
        ? [{ key: "titans", label: "TITANS", icon: "journal" }]
        : []),
      { key: "settings", label: "SETTINGS", icon: "settings" },
      // The immersive Star surface owns left/right navigation, so it stays at
      // the terminal tab instead of trapping access to later pause sections.
      { key: "talents", label: "STARS", icon: "constellation" },
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
      // Titan portraits are Boot-resident because ESC navigation must remain
      // synchronous even when optional runtime packs are under memory pressure.
      return null;
    };
    const featureConsumerForGroup = () => RUNTIME_FEATURE_ASSET_CONSUMERS.pauseStarlight;
    const featureThemeForGroup = () => "starlight";
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
      state.hintsView?.destroy?.();
      state.talentTree?.destroy?.();
      state.titanArchive?.destroy?.();
      state.featureLoadingView?.destroy?.();
      state.settings = null;
      state.saveTransfer = null;
      state.journeyView = null;
      state.hintsView = null;
      state.talentTree = null;
      state.titanArchive = null;
      state.featureLoadingView = null;
      state.controls = [];
      releaseActiveFeature();
      tabContent.removeAll(true);
    };

    const setTalentImmersive = active => {
      const visible = !active;
      // The focused talent surface owns its frame; keep the modal backdrop/input lock.
      shell.root?.setVisible?.(visible);
      state.tabs?.root?.setVisible?.(visible);
      state.hint?.root?.setVisible?.(visible);
      shell.titleText?.setVisible?.(visible && !shell.titleArt);
      shell.titleArt?.setVisible?.(visible);
      shell.subtitleText?.setVisible?.(visible);
      shell.icon?.setVisible?.(visible);
      shell.closeButton?.root?.setVisible?.(visible);
      shell.skin?.setVisible?.(visible);
      shell.panel?.setVisible?.(visible && !shell.skin);
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
      addBakedUiCaption(this, tabContent, text);
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

      addText(rect.left + 18, bodyTop + 17, PAUSE_MENU_COPY.actionsTitle, {
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
        { label: PAUSE_MENU_COPY.resume, icon: "play", accent: UI_COLORS.borderSel, action: () => this.resumeGame() },
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
        { label: PAUSE_MENU_COPY.save, icon: "journal", accent: UI_COLORS.borderGood, action: null },
        { label: PAUSE_MENU_COPY.returnToSafety, icon: "prev", accent: UI_COLORS.borderHov, action: () => this.unstuckPlayer() },
        { label: PAUSE_MENU_COPY.mainMenu, icon: "close", accent: UI_COLORS.borderBad, action: () => this.returnToMainMenu() },
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
            if (definition.label === PAUSE_MENU_COPY.save) {
              this.saveGame({ setText: value => button.setLabel(value) });
            } else {
              definition.action?.();
            }
          },
        });
        state.controls.push(button);
      });

      const bakedHeader = getBakedPauseStat(this, "header");
      const bakedLayout = BAKED_UI_ART.pauseStats.layout;
      if (bakedHeader) {
        tabContent.add(fitBakedUiImage(this.add.image(rightX + rightWidth / 2,
          bodyTop + bakedLayout.headerY, bakedHeader.key, bakedHeader.frame),
        rightWidth - 34, bakedLayout.headerHeight));
      } else {
        createIconBadge(this, "journal", {
        x: rightX + 56,
        y: bodyTop + 58,
        size: 70,
        iconSize: 58,
        selected: true,
        parent: tabContent,
      });
      addText(rightX + 104, bodyTop + 28, PAUSE_MENU_COPY.snapshotTitle, {
        fontFamily: UI_FONTS.display,
        fontSize: "20px",
        fontStyle: "bold",
        color: UI_COLORS.title,
      });
      addText(rightX + 104, bodyTop + 58, PAUSE_MENU_COPY.snapshotSubtitle, {
        fontFamily: UI_FONTS.mono,
        fontSize: "11px",
        color: UI_COLORS.gold,
      });
      }

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
        ...(systemFeatureAvailable("campfire") ? [["CAMPFIRE", buff ? buff.name.toUpperCase() : PAUSE_MENU_COPY.noActiveCampfire]] : []),
      ];
      const snapshotTop = bodyTop + (bakedHeader ? bakedLayout.rowsTop : 118);
      const bakedRowWidth = Math.min(rightWidth - 34, bakedLayout.rowHeight * bakedLayout.rowAspectRatio);
      snapshot.forEach((entry, index) => {
        const rowY = snapshotTop + index * 38;
        const bakedRow = bakedHeader && getBakedPauseStat(this, entry[0]);
        let rowArt = null;
        if (bakedRow) {
          rowArt = fitBakedUiImage(this.add.image(rightX + rightWidth / 2, rowY + 14,
            bakedRow.key, bakedRow.frame), bakedRowWidth, bakedLayout.rowHeight);
          tabContent.add(rowArt);
        } else if (index % 2 === 0) {
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
        if (!bakedRow) addText(rightX + 24, rowY + 14, entry[0], {
          fontFamily: UI_FONTS.mono,
          fontSize: "10px",
          color: UI_COLORS.dim,
        }, 0, 0.5);
        const valueX = rowArt ? rowArt.x + rowArt.displayWidth / 2 - bakedLayout.valueInset : rightX + rightWidth - 24;
        const liveValue = addText(valueX, rowY + 14, String(entry[1]), {
          fontFamily: UI_FONTS.display,
          fontSize: bakedRow ? `${bakedLayout.valueFontSize}px` : "14px",
          fontStyle: "bold",
          color: index === 2 ? UI_COLORS.gold : UI_COLORS.title,
        }, 1, 0.5);
        fitLiveUiText(liveValue, (rowArt?.displayWidth || rightWidth) * bakedLayout.valueWidthRatio);
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
        onFocus: index => state.focus?.setIndex?.(index),
        onSave: async () => {
          const saved = await this.saveGame();
          return {
            success: saved,
            message: saved ? "Current progress saved." : this.townRestSystem
              ? TOWN_REST.copy.bedOnly : "Save failed. Nothing was exported.",
          };
        },
        onExport: async () => {
          const saved = this.townRestSystem ? true : await this.saveGame();
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
          const saved = this.townRestSystem ? true : await this.saveGame();
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
          enterSceneBasePhase(this, SCENE_BASE_PHASES.TRANSITIONING, "save-import");
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

    const buildHints = () => {
      state.hintsView = createHintsPanelContent(this, {
        x: rect.left, y: bodyTop, width: rect.width, height: bodyHeight, parent: tabContent,
        onFocus: index => state.focus?.setIndex?.(index),
        onControlsChanged: (controls, index) => {
          state.controls = controls;
          state.focus?.setItems?.(controls, index);
        },
      });
      state.controls = state.hintsView.getControls();
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
      state.talentTree = createCelestialTalentTreeView(this, {
        progression: this.celestialTalentProgressionSystem,
        getMoney: () => this.upgradeSystem?.getMoney?.() || 0,
        onClose: () => state.tabs?.setActive?.(0),
        onControlsChanged: (controls, index) => {
          state.controls = controls;
          state.focus?.setItems?.(controls, index);
        },
        onNodePurchased: result => {
          const unlockedEngineIds = result.snapshot?.unlockedAbilityIds
            || this.celestialTalentProgressionSystem?.getSnapshot?.()?.unlockedAbilityIds
            || [];
          this.starHeartProgressionSystem
            ?.syncTalentUnlockedEngines?.(unlockedEngineIds);
          this.celestialActionBarSystem?.sync?.();
          this.celestialCurrencyHudSystem?.update?.(true);
          this.queueDugTilesSave?.();
        },
      });
      state.talentTree.open();
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
        onSectionChange: direction => state.tabs.setActive(
          (state.activeTab + direction + pauseTabs.length) % pauseTabs.length,
        ),
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
              PAUSE_MENU_COPY.featureLoadFailed,
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
      else if (tabKey === "hints") buildHints();
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
      text: PAUSE_MENU_COPY.navigationHint,
      parent: shell.root,
    });
    state.focus = createFocusController(this, {
      items: [],
      enabled: () => Boolean(this._pausePanel) && !this._settingsKeyCaptureActive
        && state.activeTab !== settingsTabIndex,
      onTab: (direction, event) => {
        if (!event?.ctrlKey) return false;
        state.tabs.setActive((state.activeTab + direction + pauseTabs.length) % pauseTabs.length);
        return true;
      },
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
    setTalentImmersive(Boolean(state.talentTree));
    return true;
  };

  prototype.toggleInventoryFromHud = function() {
    if (this.gameState !== "playing") return false;
    if (!this.uiInventoryPopup) return false;
    if (hasEscapeClosableUi(this) && !this.uiInventoryPopup.isOpen) return false;
    if (this.uiInventoryPopup.isOpen) {
      this.uiInventoryPopup.close?.();
    } else if (typeof this.uiInventoryPopup.toggle === "function") {
      this.uiInventoryPopup.toggle();
    } else {
      this.uiInventoryPopup.open?.();
    }
    return true;
  };

  prototype.togglePauseMenuFromHud = function() {
    if (this.uiInventoryPopup?.isOpen) {
      this.uiInventoryPopup.close?.();
      return true;
    }
    if (this._pausePanel || this.gameState === "paused") {
      this.resumeGame?.();
      return true;
    }
    if (this.gameState !== "playing" || hasEscapeClosableUi(this)) return false;
    return this.showPauseMenu?.() === true;
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
    pause.state?.hintsView?.destroy?.();
    pause.state?.talentTree?.destroy?.();
    pause.state?.titanArchive?.destroy?.();
    pause.state?.releaseFeatureAssets?.();
    pause.state?.tabs?.destroy?.();
    pause.state?.hint?.destroy?.();
    pause.shell?.hide?.(() => pause.shell?.destroy?.());
  };

  prototype.showWorldMap = function(options = {}) {
    if (this.gameState !== "playing" || this.townRestSystem?.isActive()) return false;
    const focusTile = options.focusTile;
    if (Number.isFinite(focusTile?.tx) && Number.isFinite(focusTile?.ty)) {
      this._pendingWorldMapFocusTile = { tx: focusTile.tx, ty: focusTile.ty };
    }
    if (this.worldMapOverlay?.isOpen) {
      const centered = this.worldMapOverlay.centerOnTile?.(
        this._pendingWorldMapFocusTile,
      ) === true;
      if (centered) this._pendingWorldMapFocusTile = null;
      return centered;
    }
    if (this._worldMapFeatureLoading) return true;
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
          this._pendingWorldMapFocusTile = null;
          manager.releaseGroup(groupId, consumer);
          return;
        }
        this.showWorldMap({ focusTile: this._pendingWorldMapFocusTile });
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
    const requestedFocus = this._pendingWorldMapFocusTile;
    const opened = this.worldMapOverlay.open({ focusTile: requestedFocus });
    if (opened) this._pendingWorldMapFocusTile = null;
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
    this._pendingWorldMapFocusTile = null;
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

    if (this.understarEndingSystem?.closeOverlay?.()) {
      return true;
    }

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
      releaseSceneSuspension(this, "_dialogSuspension");
      this.playerController?.setControlsEnabled?.(this.sceneModeController.isGameplayActive);
      return true;
    }

    if (this._pausePanel || this.gameState === "paused") {
      this.resumeGame?.();
      return true;
    }

    return false;
  };

  prototype.saveGame = async function(labelObj) {
    if (this.townRestSystem) {
      if (this._pausePanel || this.gameState === 'paused') this.resumeGame();
      this.townRestSystem.showSaveHint();
      return false;
    }
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
    if (saved !== false) this.soundSystem?.playManualSave?.();
    return saved !== false;
  };

  prototype.resumeGame = function() {
    this.hidePauseMenu();
    releaseSceneSuspension(this, "_pauseSuspension");
    this.playerController.setControlsEnabled(this.sceneModeController.isGameplayActive);
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

  prototype.returnToMainMenu = function() {
    if (this._returnToMainMenuPromise) return this._returnToMainMenuPromise;

    const operation = (async () => {
      try {
        this.hidePauseMenu?.();
      } catch (error) {
        console.warn('[PlayScene] Pause cleanup failed while returning to the main menu:', error);
      }
      try {
        releaseSceneSuspension(this, "_pauseSuspension");
      } catch (error) {
        console.warn('[PlayScene] Pause ownership release failed while returning to the main menu:', error);
      }
      try {
        enterSceneBasePhase(this, SCENE_BASE_PHASES.TRANSITIONING, "return-main-menu");
      } catch (error) {
        console.warn('[PlayScene] Transition-state cleanup failed while returning to the main menu:', error);
      }

      let saved = true;
      try {
        this.queueDugTilesSave?.();
        if (!this.townRestSystem && typeof this.flushDugTilesSave === "function") {
          const saveOutcome = await awaitBoundedMainMenuSave(
            this.flushDugTilesSave({ scheduled: false, force: true }),
            this._mainMenuSaveTimeoutMs ?? SAVE_SCHEDULING_CONFIG.mainMenuFlushTimeoutMs,
          );
          saved = saveOutcome.value;
          if (saveOutcome.timedOut) {
            console.warn('[PlayScene] Save timed out while returning to the main menu; continuing exit.');
          }
        }
      } catch (error) {
        saved = false;
        console.warn('[PlayScene] Save failed while returning to the main menu:', error);
      }
      if (saved === false) {
        console.warn('[PlayScene] Save failed while returning to the main menu.');
      }

      if (typeof this.scene?.start !== "function") {
        console.error('[PlayScene] Main menu transition is unavailable.');
        return false;
      }
      try {
        this.scene.start("MainMenuScene");
        return true;
      } catch (error) {
        console.error('[PlayScene] Main menu transition failed:', error);
        return false;
      }
    })();

    this._returnToMainMenuPromise = operation;
    operation.then(
      succeeded => {
        if (!succeeded && this._returnToMainMenuPromise === operation) {
          this._returnToMainMenuPromise = null;
        }
      },
      () => {
        if (this._returnToMainMenuPromise === operation) {
          this._returnToMainMenuPromise = null;
        }
      },
    );
    return operation;
  };

  prototype.unstuckPlayer = function() {
    return this.requestHardcoreUnstuck?.() ?? false;
  };

  prototype.enterTitleState = function() {
    enterSceneBasePhase(this, SCENE_BASE_PHASES.LOADING, "title-state");
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
    enterSceneBasePhase(this, SCENE_BASE_PHASES.ACTIVE, "start-run");
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
    this.sessionAwakeningController?.begin();
  };

  prototype.enterDeathState = function(depth) {
    return this.handleCasualBoundaryRescue?.(depth) ?? false;
  };

  prototype.restartRun = async function() {
    if (this._hardcoreDeathInProgress) return false;
    enterSceneBasePhase(this, SCENE_BASE_PHASES.TRANSITIONING, "restart-run");
    this.playerController?.setControlsEnabled?.(false);
    this.queueDugTilesSave();
    const saved = this.townRestSystem ? true : await this.flushDugTilesSave();
    if (saved === false) {
      this.setSceneBasePhase(SCENE_BASE_PHASES.ACTIVE, { owner: "restart-save-failed" });
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
    this.floatingTextSystem?.loadSaveData?.(savedData.starCollectionData);
    this.floatingTextSystem?.recoverStarIdentityCountsFromWorld?.(this.worldModel);
    this.milestoneBoardSystem?.loadSaveData?.(savedData.milestoneData);
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
    applyCelestialOverhaulState(this, savedData);
    this.floatingTextSystem?.tryUnlockEligibleConstellations?.();

    // Restore paired teleporter data (sky island teleporter tiles)
    if (savedData.specialTileData && this.specialTileSystem) {
      this.specialTileSystem.loadSaveData(savedData.specialTileData);
    }
    this.firstSessionPortalSystem?.ensure();
    this.randomEventBridge?.loadSaveData?.(savedData.specialTileData?.randomWorldEvents);

    if (this.retentionProgressSystem) {
      this.retentionProgressSystem.loadSaveData(savedData.retentionData);
      this.retentionProgressSystem.seedLegacyProgress({
        dugTileKeys: savedData.dugTiles,
        resources: savedData.resources,
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
      this.weatherSystem?.fromJSON?.(savedData.dayNightData.weather);
    }
    this.journeySystem?.loadSaveData?.(savedData.journeyData);
    this.journeySystem?.seedCurrentState?.();
    this.understarEndingSystem?.loadSaveData?.(savedData.understarEndingData);

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

  prototype.queueDugTilesSave = function(reason = "gameplay-mutation") {
    if (this._saveWritesBlocked || this._hardcoreDeathInProgress) return false;
    return this.gameSaveCoordinator?.requestSnapshot?.(reason) === true;
  };

  prototype.flushDugTilesSave = function({ scheduled = false, force = false, reason = "manual-flush" } = {}) {
    if (this._saveWritesBlocked || this._hardcoreDeathInProgress) return Promise.resolve(false);
    return this.gameSaveCoordinator?.flush?.({ scheduled, force, reason }) ?? Promise.resolve(false);
  };

  prototype.resize = function() {
    this.hudSystem?.resize?.();
    this.uiNotifications?.resize?.();
    this.xpProgressBar?.resize?.();
    this.levelUpRewardPresentation?.resize?.();
    this.celestialActionBarSystem?.resize?.();
    this.celestialCurrencyHudSystem?.resize?.();
    this.uiInventoryPopup?.resize?.();
    this.nextPromiseHudSystem?.resize?.();
    this.randomEventBridge?.resize?.();
    this.townSquareTutorialSystem?.resize?.();
    this.celestialEngineController?.resize?.();
    this.starHeartOverlay?.resize?.();
  };
}

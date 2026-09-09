import { createButton, createFocusController, createHintLegend, createPanel, createTabBar } from "../PhaserUiKit.js";
import { createIconBadge, createModalShell } from "../UiModalShell.js";
import { UINotificationSystem } from "../UINotificationSystem.js";
import { createPauseFeatureLoadingView } from "../components/PauseFeatureLoadingView.js";
import { createTeleportLoadingOverlay } from
  "../components/TeleportLoadingOverlay.js";
import { createSessionAwakeningView } from "../components/SessionAwakeningView.js";
import { UIMuteToggle } from "../hud/UIMuteToggle.js";
import { XPProgressBar } from "../hud/XPProgressBar.js";
import { CelestialTalentTreeView } from "../overlays/CelestialTalentTreeView.js";
import { HardcoreModalOverlay } from "../overlays/HardcoreModalOverlay.js";
import { createJourneyPanelContent } from "../overlays/JourneyView.js";
import { createHintsPanelContent } from "../overlays/HintsPanelContent.js";
import { createSaveTransferPanelContent } from "../overlays/SaveTransferPanelContent.js";
import { createSettingsPanelContent } from "../overlays/SettingsPanelContent.js";
import { ShopOverlay } from "../overlays/ShopOverlay.js";
import { SleepingJackpotModalOverlay } from "../overlays/SleepingJackpotModalOverlay.js";
import { TitanArchiveView } from "../overlays/TitanArchiveView.js";
import { UIInventoryPopup } from
  "../overlays/UIInventoryPopup.js?rev=20260826-inventory-codex-v3";
import { UnderstarEndingOverlay } from "../overlays/UnderstarEndingOverlay.js";
import { WorldMapOverlay } from "../overlays/WorldMapOverlay.js";
import { PlaySceneRecoveryOverlay } from "./PlaySceneRecoveryOverlay.js";

export const PLAY_SCENE_UI_METHOD_DEPENDENCIES = Object.freeze({
  createButton,
  createCelestialTalentTreeView: (scene, options) => new CelestialTalentTreeView(scene, options),
  createFocusController,
  createHintLegend,
  createIconBadge,
  createJourneyPanelContent,
  createHintsPanelContent,
  createModalShell,
  createPanel,
  createPauseFeatureLoadingView,
  createSaveTransferPanelContent,
  createSettingsPanelContent,
  createTabBar,
  ShopOverlay,
  TitanArchiveView,
  UIMuteToggle,
  UINotificationSystem,
  UIInventoryPopup,
  WorldMapOverlay,
  XPProgressBar,
});

const worldUiFactories = Object.freeze({
  createButton,
  createIconBadge,
  createModalShell,
  createCelestialTalentTreeView: (scene, options) => new CelestialTalentTreeView(scene, options),
});

export const PLAY_SCENE_UI_PORTS = Object.freeze({
  worldUiFactories,
  createNotificationSystem: scene => new UINotificationSystem(scene),
  createHardcoreModalOverlay: (scene, config) => new HardcoreModalOverlay(scene, config),
  createSleepingJackpotModalOverlay: scene => new SleepingJackpotModalOverlay(scene),
  createUnderstarEndingOverlay: (scene, callbacks) => (
    new UnderstarEndingOverlay(scene, callbacks)
  ),
  createRecoveryOverlay: scene => new PlaySceneRecoveryOverlay(scene),
  createTeleportLoadingOverlay,
  createSessionAwakeningView,
});

import { GAME_CONFIG } from "./values/gameConfig.js";
import { BootScene } from "./ui/scenes/BootScene.js?rev=20260818-feedback-session-v1";
import { MenuAudioScene } from "./ui/scenes/MenuAudioScene.js";
import { MainMenuScene } from "./ui/scenes/MainMenuScene.js";
import { StartMenuScene } from "./ui/scenes/StartMenuScene.js?rev=20260727-save-transfer-v1";
import { WorldLoadScene } from "./ui/scenes/WorldLoadScene.js?rev=20260718";
import { PlayScene } from "./ui/scenes/PlayScene.js?rev=20260820-complex-dig-v1";
import { CaveScene } from "./ui/scenes/CaveScene.js?rev=20260729-native-density-v14";
import {
  finalizeRenderDensityFoundation,
  installRenderDensityFoundation,
  resolveRenderDensityProfile,
} from "./systems/visual/RenderDensitySystem.js";
import { installRuntimeCanarySystem } from "./systems/health/RuntimeCanarySystem.js";
import { installAdminHealthPanel } from "./ui/admin/AdminHealthPanel.js";
import { USER_SETTINGS, normalizeKeyboardEvent } from "./systems/UserSettings.js";
import {
  RUNTIME_ASSET_LOADING,
  resolveRuntimeAssetQueueEnabled,
} from "./values/runtimeAssetLoading.js";
import { waitForUiFonts } from "./values/uiLayout.js";
import { resolveGameplayCapabilities } from "./values/gameplayCapabilities.js";

const runtimeCanarySystem = installRuntimeCanarySystem({
  globalRef: window,
  documentRef: document,
});

function captureUiError(kind, detail) {
  return runtimeCanarySystem.captureError(kind, detail);
}

window.addEventListener("error", event => {
  captureUiError("error", event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
  captureUiError("unhandledrejection", event.reason || "Unhandled promise rejection");
});

document.addEventListener("keydown", event => {
  if (event.repeat || normalizeKeyboardEvent(event) !== USER_SETTINGS.getKey("fullscreen")) return;
  if (typeof window.__toggleGameFullscreen !== "function") return;

  event.preventDefault();
  window.__fullscreenToggleHandledAt = Date.now();
  window.__toggleGameFullscreen().catch(error => {
    console.warn("[Fullscreen] Toggle failed:", error);
  });
});

const renderDensityProfile = resolveRenderDensityProfile(globalThis.window?.location?.search || "");
const runtimeAssetQueueEnabled = resolveRuntimeAssetQueueEnabled();
const gameplayCapabilities = resolveGameplayCapabilities({
  search: globalThis.window?.location?.search || "",
  hostname: globalThis.window?.location?.hostname || "",
  allowProfileOverride: globalThis.__DIG_GAME_PRODUCTION__ !== true,
});

const phaserConfig = {
  type: renderDensityProfile.rendererMode === "auto" ? Phaser.AUTO : Phaser.WEBGL,
  parent: "game-root",
  width: renderDensityProfile.backingWidth,
  height: renderDensityProfile.backingHeight,
  render: {
    pixelArt: GAME_CONFIG.rendererQuality.pixelArt,
    antialias: GAME_CONFIG.rendererQuality.antialias,
    antialiasGL: GAME_CONFIG.rendererQuality.antialiasGL,
    roundPixels: GAME_CONFIG.rendererQuality.roundPixels,
    powerPreference: GAME_CONFIG.rendererQuality.powerPreference,
    preserveDrawingBuffer: GAME_CONFIG.rendererQuality.preserveDrawingBuffer,
  },
  backgroundColor: "#111820",
  gameplayCapabilities,
  ...(runtimeAssetQueueEnabled ? {
    loader: {
      maxParallelDownloads: RUNTIME_ASSET_LOADING.phaserLoader.maxParallelDownloads,
    },
  } : {}),
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
      fixedStep: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  callbacks: {
    preBoot: game => {
      game.registry.set("gameplayCapabilities", gameplayCapabilities);
      installRenderDensityFoundation(game, renderDensityProfile);
    },
    postBoot: game => {
      finalizeRenderDensityFoundation(game, renderDensityProfile);
      runtimeCanarySystem.attachGame(game);
    },
  },
  scene: [BootScene, MenuAudioScene, MainMenuScene, StartMenuScene, WorldLoadScene, PlayScene, CaveScene],
};

installAdminHealthPanel(runtimeCanarySystem, {
  globalRef: window,
  documentRef: document,
});

await waitForUiFonts(document);

try {
  window.__phaserGame = new Phaser.Game(phaserConfig);
} catch (error) {
  captureUiError(runtimeCanarySystem.config.events.runtimeError, error);
  throw error;
}

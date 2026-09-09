import { LaunchScene } from "./ui/scenes/LaunchScene.js";
import { sessionLogging } from "./session-logging.js";
import { GAME_CONFIG } from "./values/gameConfig.js";
import {
  finalizeRenderDensityFoundation,
  installRenderDensityFoundation,
  resolveRenderDensityProfile,
} from "./systems/visual/RenderDensitySystem.js";
import { installRuntimeCanarySystem } from "./systems/health/RuntimeCanarySystem.js";
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
      maxRetries: RUNTIME_ASSET_LOADING.phaserLoader.maxRetries,
      timeout: RUNTIME_ASSET_LOADING.phaserLoader.timeoutMs,
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
      game.registry.set("runtimeCanarySystem", runtimeCanarySystem);
      installRenderDensityFoundation(game, renderDensityProfile);
    },
    postBoot: game => {
      finalizeRenderDensityFoundation(game, renderDensityProfile);
      runtimeCanarySystem.attachGame(game);
      sessionLogging?.attachGame(game);
    },
  },
  scene: [LaunchScene],
};

// The logo can render while font readiness settles.
void waitForUiFonts(document);

try {
  window.__phaserGame = new Phaser.Game(phaserConfig);
} catch (error) {
  captureUiError(runtimeCanarySystem.config.events.runtimeError, error);
  throw error;
}

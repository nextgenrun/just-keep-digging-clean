import { GAME_CONFIG } from "./values/gameConfig.js";
import { BootScene } from "./ui/scenes/BootScene.js";
import { MenuAudioScene } from "./ui/scenes/MenuAudioScene.js";
import { MainMenuScene } from "./ui/scenes/MainMenuScene.js";
import { StartMenuScene } from "./ui/scenes/StartMenuScene.js?rev=20260718";
import { WorldLoadScene } from "./ui/scenes/WorldLoadScene.js?rev=20260718";
import { PlayScene } from "./world/PlayScene.js?rev=20260718-mesh-grounded";
import { CaveScene } from "./ui/scenes/CaveScene.js";
import {
  finalizeRenderDensityFoundation,
  installRenderDensityFoundation,
  resolveRenderDensityProfile,
} from "./systems/visual/RenderDensitySystem.js";
import { installRuntimeCanarySystem } from "./systems/health/RuntimeCanarySystem.js";
import { installAdminHealthPanel } from "./ui/admin/AdminHealthPanel.js";
import { USER_SETTINGS, normalizeKeyboardEvent } from "./systems/UserSettings.js";

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
  },
  backgroundColor: "#111820",
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
    preBoot: game => installRenderDensityFoundation(game, renderDensityProfile),
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

try {
  window.__phaserGame = new Phaser.Game(phaserConfig);
} catch (error) {
  captureUiError(runtimeCanarySystem.config.events.runtimeError, error);
  throw error;
}

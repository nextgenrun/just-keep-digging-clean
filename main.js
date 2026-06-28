import { GAME_CONFIG } from "./values/gameConfig.js";
import { BootScene } from "./ui/scenes/BootScene.js";
import { MenuAudioScene } from "./ui/scenes/MenuAudioScene.js";
import { MainMenuScene } from "./ui/scenes/MainMenuScene.js";
import { StartMenuScene } from "./ui/scenes/StartMenuScene.js";
import { WorldLoadScene } from "./ui/scenes/WorldLoadScene.js";
import { PlayScene } from "./world/PlayScene.js";

window.__jkdUiErrors = window.__jkdUiErrors || [];

function captureUiError(kind, detail) {
  const entry = {
    kind,
    message: detail?.message || String(detail || "Unknown UI error"),
    stack: detail?.stack || "",
    at: new Date().toISOString(),
  };
  window.__jkdUiErrors.push(entry);
  if (window.__jkdUiErrors.length > 80) window.__jkdUiErrors.shift();
}

window.addEventListener("error", event => {
  captureUiError("error", event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
  captureUiError("unhandledrejection", event.reason || "Unhandled promise rejection");
});

const phaserConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: GAME_CONFIG.viewportWidth,
  height: GAME_CONFIG.viewportHeight,
  pixelArt: true,
  roundPixels: true,
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
  scene: [BootScene, MenuAudioScene, MainMenuScene, StartMenuScene, WorldLoadScene, PlayScene],
};

window.__phaserGame = new Phaser.Game(phaserConfig);
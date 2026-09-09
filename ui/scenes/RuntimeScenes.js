import { BootScene } from "./BootScene.js?rev=20260901-worldroot-v4-clean-matte-v2";
import { MenuAudioScene } from "./MenuAudioScene.js?rev=20260830-menu-first-v1";
import { MainMenuScene } from "./MainMenuScene.js";
import { OpeningCinematicScene } from "./OpeningCinematicScene.js";
import { StartMenuScene } from "./StartMenuScene.js?rev=20260727-save-transfer-v1";
import { WorldLoadScene } from "./WorldLoadScene.js?rev=20260718";
import { PlayScene } from "./PlayScene.js?rev=20260901-worldroot-v4-clean-matte-v2";
import { CaveScene } from "./CaveScene.js?rev=20260831-stable-animation-moving-drop-v1";
import { installAdminHealthPanel } from "../admin/AdminHealthPanel.js";

export function registerRuntimeScenes(game) {
  for (const Scene of [BootScene, OpeningCinematicScene, MenuAudioScene, MainMenuScene, StartMenuScene, WorldLoadScene, PlayScene, CaveScene]) {
    const scene = new Scene();
    if (!game.scene.keys[scene.sys.settings.key]) game.scene.add(scene.sys.settings.key, scene, false);
  }
  installAdminHealthPanel(game.registry.get("runtimeCanarySystem"), { globalRef: window, documentRef: document });
}

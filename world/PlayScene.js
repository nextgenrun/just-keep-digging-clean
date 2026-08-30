import { setupScene } from "./playScene/PlaySceneSetup.js?rev=20260826-surface-motion-v2";
import { setupGameplayMethods } from "./playScene/PlaySceneGameplay.js?rev=20260821-moving-complex-dig-v1";
import { updateScene } from "./playScene/PlaySceneUpdate.js?rev=20260821-moving-complex-dig-v1";
import {
  updatePlaySceneCameraPhase,
  updatePlaySceneLightingPhase,
  updatePlayScenePresentationPhase,
  updatePlaySceneWorldPhase,
} from "./playScene/PlaySceneFramePhases.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { UI_CONFIG } from "../values/uiConfig.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { WEATHER_CONFIG } from "../values/weatherConfig.js";

export function createPlaySceneConfig() {
  return Object.freeze({
    ...GAME_CONFIG,
    ...PLAYER_STATS_CONFIG,
    ...PLAYER_ABILITIES_CONFIG,
    ...UI_CONFIG,
    ...MINING_CONFIG,
    weather: WEATHER_CONFIG,
  });
}

export function installPlaySceneWorldMethods(prototype) {
  setupGameplayMethods(prototype);
}

export async function createPlaySceneWorld(scene, data, uiPorts) {
  return setupScene.call(scene, data, uiPorts);
}

export function updatePlaySceneWorld(scene, time, delta) {
  return updateScene.call(scene, time, delta);
}

export {
  updatePlaySceneCameraPhase,
  updatePlaySceneLightingPhase,
  updatePlayScenePresentationPhase,
  updatePlaySceneWorldPhase,
};

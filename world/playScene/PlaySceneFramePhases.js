import { PERFORMANCE_TELEMETRY_CONFIG } from "../../values/performanceTelemetryConfig.js";
import {
  performanceNow,
  recordPerformanceSpan,
} from "../../systems/health/performanceTelemetryBridge.js";
import { updateCameraSystems, updateLightingSystems } from "./PlaySceneUpdate.js";

export function updatePlaySceneWorldPhase(scene) {
  if (!scene.backgroundRenderer || !scene.playerController) return;
  const playerPosition = scene.playerController.getPlayerPosition();
  if (playerPosition) scene.backgroundRenderer.updateUndergroundLoopVisibility(playerPosition.y);
}

export function updatePlayScenePresentationPhase(scene) {
  scene.worldBackgroundMasterSystem?.update();
}

export function updatePlaySceneCameraPhase(scene, time, delta) {
  scene._cameraLightingStartedAtMs = scene._samplePerformancePhases ? performanceNow() : null;
  updateCameraSystems(scene, time, delta);
}

export function updatePlaySceneLightingPhase(scene, time, delta) {
  updateLightingSystems(scene, time, delta, scene._framePlayerTile);
  if (!scene._samplePerformancePhases) return;
  recordPerformanceSpan(
    PERFORMANCE_TELEMETRY_CONFIG.phases.playCameraLighting,
    scene._cameraLightingStartedAtMs,
  );
}

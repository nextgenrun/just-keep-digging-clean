import { GAME_CONFIG } from "../../../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../../../values/playerStats.js";
import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../../../values/playerKinematicMotion.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE } from "../../../values/ualNativePlayerAssetProfile.js";
import { UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG } from "../../../values/ualNativeLocomotionTransitions.js";
import { UAL_ANIMATION_TUNING_LAB_CONFIG as LAB } from "../../../values/ualAnimationTuningLab.js";

export const LAB_PATHS = Object.freeze({
  runtimeBase: LAB.productionAssetRoot,
  manifest: LAB.productionManifestPath,
});

export const LAB_SCENARIOS = LAB.scenarios;
export const LAB_VIEW = LAB.view;
export const LAB_TIMELINE = LAB.timeline;
export const LAB_MINING = LAB.mining;
export const LAB_CONTROL_BOUNDS = LAB.controls;
export const LAB_EDITOR_CONFIG = LAB.editor;

export function createInitialState() {
  const profile = UAL_NATIVE_PLAYER_ASSET_PROFILE;
  const walk = PLAYER_KINEMATIC_MOTION_CONFIG.locomotion.walk;
  return {
    ...LAB.defaults,
    editorTool: LAB.editor.defaults.activeTool,
    editorScope: LAB.editor.defaults.scope,
    selectedMarker: LAB.editor.defaults.selectedMarker,
    snapToPixels: LAB.editor.defaults.snapToPixels,
    bypassEdits: false,
    editorDraft: null,
    speedPxPerSec: PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
    strideTilesPerCycle: walk.strideTilesPerCycle,
    cadenceMin: walk.minTimeScale,
    cadenceMax: walk.maxTimeScale,
    startTrimFrames: profile.walkStartFrames.length,
    stopTrimFrames: profile.walkStopFrames.length,
    startTrimMax: profile.walkFrames.length - profile.walkStartFrames[0],
    stopTrimMax: profile.walkStopFrames[0] + 1,
    runEnterSpeedPxPerSec: UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG.ground.runEnterSpeedPxPerSec,
    runExitSpeedPxPerSec: UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG.ground.runExitSpeedPxPerSec,
    landingFrameCount: profile.landingFrames.length,
    landingFrameMax: profile.landingFrames.length,
    flightHoverSeconds: LAB.timeline.flight.hoverSeconds,
    flightTravelSeconds: LAB.timeline.flight.travelSeconds,
    comboGapMs: LAB.timeline.mining.recoveryGapSeconds * 1000,
    contactFrameOffset: 0,
    contactScale: 1,
    tileSize: GAME_CONFIG.tileSize,
    displaySizePx: profile.displaySizePx,
    targetVisibleHeightTiles: profile.targetVisibleHeightTiles,
    bodyWidthPx: profile.playerBodyWidthPx,
    bodyHeightPx: profile.playerBodyHeightPx,
    bodyOffsetXPx: LAB.editor.defaults.bodyOffsetXPx,
    bodyOffsetYPx: LAB.editor.defaults.bodyOffsetYPx,
  };
}

export function scenarioById(id) {
  return LAB_SCENARIOS.find((entry) => entry.id === id) || LAB_SCENARIOS[0];
}

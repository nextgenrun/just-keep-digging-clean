import fs from "node:fs";
import path from "node:path";

import { createUalNativePlayerAnimations } from "../player/UalNativePlayerAnimations.js";
import { getUniquePlayerSheetEntries } from "../player/PlayerAssetSheetCatalog.js";
import {
  resolvePlayerDisplaySizePx,
  resolvePlayerVisualOrigin,
} from "../values/playerAssetProfiles.js";
import { PLAYER_KINEMATIC_MOTION_CONFIG } from "../values/playerKinematicMotion.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../values/survivalUalPlayerAssetProfile.js?rev=20260814-quality-v1";
import { UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG } from
  "../values/ualNativeLocomotionTransitions.js";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Pass an output JSON path.");

const created = [];
const scene = {
  textures: {
    exists: () => true,
    get: () => ({ setFilter: () => {} }),
  },
  anims: {
    exists: (key) => created.some((entry) => entry.key === key),
    create: (entry) => created.push(entry),
  },
};
createUalNativePlayerAnimations(scene, profile);

const sheets = getUniquePlayerSheetEntries(profile).map((entry) => ({
  key: entry.key,
  property: entry.property,
  path: entry.path.split("?")[0],
  frameWidth: entry.frameConfig.frameWidth,
  frameHeight: entry.frameConfig.frameHeight,
  highestReferencedFrame: entry.frameConfig.endFrame,
}));
const sheetByKey = Object.fromEntries(sheets.map((entry) => [entry.key, entry]));

function familyFor(key) {
  if (/walk-start|walk-stop|stop-contact|landing|wall-brace|settle/.test(key)) return "transition";
  if (/run|walk-loop/.test(key)) return "locomotion";
  if (/flight|fly|airborne|falling/.test(key)) return "airborne-flight";
  if (/dig|strike|slash|punch/.test(key)) return "mining-combat";
  if (/idle|lean-wall|wall-push|crouch/.test(key)) return "idle-pose";
  if (/death|hit-react/.test(key)) return "reaction";
  return "ability-other";
}

const animations = created.map((animation) => {
  const sheetKey = animation.frames[0]?.key;
  const frames = animation.frames.map((entry) => Number(entry.frame));
  return {
    key: animation.key,
    family: familyFor(animation.key),
    sheetKey,
    sheetPath: sheetByKey[sheetKey]?.path || null,
    frames,
    frameRate: animation.frameRate,
    repeat: animation.repeat,
    displaySizePx: resolvePlayerDisplaySizePx(profile, profile.displaySizePx, animation.key),
    origin: resolvePlayerVisualOrigin(profile, animation.key, sheetKey),
    contact: profile.actionContactByAnimation?.[animation.key]
      || profile.quickslashActionContactByAnimation?.[animation.key]
      || null,
  };
});

const keys = new Set(animations.map((animation) => animation.key));
const edges = [];
function edge(from, to, reason) {
  if (keys.has(from) && keys.has(to)) edges.push({ from, to, reason });
}
edge(profile.idleAnim, profile.walkStartAnim, "movement-enter");
edge(profile.walkStartAnim, profile.walkRunAnim, "start-to-gait");
edge(profile.walkRunAnim, profile.walkStopAnim, "movement-release");
edge(profile.walkStopAnim, profile.idleAnim, "stop-to-idle");
if (!profile.continuousFlightLoop) {
  edge(profile.flightEnterAnim, profile.flightTravelLoopAnim, "flight-enter");
  edge(profile.flightTravelLoopAnim, profile.flightExitAnim, "flight-exit");
}
edge(profile.airborneAnim, profile.fallingAnim, "jump-apex");
edge(profile.fallingAnim, profile.landingAnim, "ground-impact");
for (const [from, to] of Object.entries(
  profile.actionRecoveryAnimationByCompletedAnimation || {},
)) {
  edge(from, to, "action-recovery");
  edge(to, profile.idleAnim, "recovery-idle");
}
for (const animation of animations) {
  if (/moving-(side|diagonal).*-anim/.test(animation.key)) {
    edge(profile.walkRunAnim, animation.key, "moving-action-enter");
    edge(animation.key, profile.walkRunAnim, "moving-action-resume");
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  profile: {
    characterId: profile.characterId,
    version: profile.version,
    renderPipeline: profile.renderPipeline,
    frameWidth: profile.frameWidth,
    frameHeight: profile.frameHeight,
    defaultDisplaySizePx: profile.displaySizePx,
    defaultOrigin: { x: profile.visualOriginX, y: profile.visualOriginY },
    tileSizePx: GAME_CONFIG.tileSize,
    groundedGaitRole: UAL_NATIVE_LOCOMOTION_TRANSITION_CONFIG.ground.gaitAnimationRole,
    kinematicMotion: PLAYER_KINEMATIC_MOTION_CONFIG,
    strideTilesPerCycleByAnimation: profile.strideTilesPerCycleByAnimation || {},
  },
  counts: {
    animations: animations.length,
    referencedFrames: animations.reduce((sum, animation) => sum + animation.frames.length, 0),
    uniqueSheets: sheets.length,
    transitionEdges: edges.length,
  },
  sheets,
  animations,
  transitionEdges: edges,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.counts));

import { calculateStrideMatchedTimeScale } from "../../../systems/visual/PlayerKinematicMotionSystem.js";
import { GAME_CONFIG } from "../../../values/gameConfig.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE as PROFILE } from "../../../values/ualNativePlayerAssetProfile.js";
import { resolveUalActionTimeScale, resolveUalFlightTimeScale } from "../../../values/ualNativeActionTuning.js";
import { LAB_MINING, LAB_TIMELINE } from "./labConfig.js";
import { buildFrameHolds, frameDurationSeconds, weightedFrameSnapshot } from "./labFrameTiming.js";

function trimmedWalk(base, id, count, reverse = false) {
  const configured = reverse ? PROFILE.walkStopFrames : PROFILE.walkStartFrames;
  const step = Math.sign((configured[1] ?? configured[0] + (reverse ? -1 : 1)) - configured[0]) || 1;
  const frames = Array.from({ length: Math.max(1, count) }, (_, index) => configured[0] + step * index)
    .filter((frame) => base.frames.includes(frame));
  const footstepKey = reverse ? PROFILE.walkStopAnim : PROFILE.walkStartAnim;
  return {
    ...base,
    id,
    label: reverse ? "Draft walk stop" : "Draft walk start",
    animationKey: reverse ? PROFILE.walkStopAnim : PROFILE.walkStartAnim,
    frames,
    footstepIndices: PROFILE.footstepFrameIndices[footstepKey] || [],
    loop: false,
  };
}

function trimmedLanding(base, count) {
  const frameCount = Math.max(1, Math.min(base.frames.length, Math.round(count)));
  return { ...base, id: "landing-draft", label: `Landing · ${frameCount}/${base.frames.length} frames`, frames: base.frames.slice(0, frameCount) };
}

function gaitTimeScale(clip, state, speed) {
  if (state.cadenceMode === "native") return 1;
  return calculateStrideMatchedTimeScale({
    speedPxPerSec: Math.max(1, speed),
    frameCount: clip.frames.length,
    frameRate: 30,
    stridePx: state.strideTilesPerCycle * GAME_CONFIG.tileSize,
    minTimeScale: state.cadenceMin,
    maxTimeScale: state.cadenceMax,
  });
}

function timeScaleFor(clip, state, speed) {
  if (state.cadenceMode === "native") return 1;
  if (["walk", "run", "walk-start", "walk-stop"].includes(clip.id)) {
    return gaitTimeScale(clip, state, speed);
  }
  if (clip.id.startsWith("flight-")) {
    return resolveUalFlightTimeScale(speed, clip.flightTravel);
  }
  if (clip.kind === "action") {
    return resolveUalActionTimeScale({
      frameCount: clip.frames.length,
      frameRate: 30,
      effectiveCooldownMs: GAME_CONFIG.mineCooldownMs,
    });
  }
  return 1;
}

function makeSegment(phase, clip, state, options = {}) {
  const speed = Number.isFinite(options.speed) ? options.speed : state.speedPxPerSec;
  const timeScale = timeScaleFor(clip, state, speed);
  const holdScope = state.editorTool === "pose" && state.editorScope === "action" ? "action" : "effective";
  const frameHolds = buildFrameHolds(clip, state.editorDraft, holdScope);
  const naturalDuration = frameDurationSeconds(frameHolds, timeScale);
  return {
    id: options.id || `${phase}-${clip.id}`,
    phase,
    clip,
    speed,
    timeScale,
    loop: options.loop ?? clip.loop,
    frameHolds,
    duration: options.holdSeconds ?? naturalDuration,
    note: options.note || "",
  };
}

function locomotion(state, clips) {
  const timing = LAB_TIMELINE.locomotion;
  const walk = clips.get("walk");
  const start = trimmedWalk(walk, "walk-start", state.startTrimFrames);
  const stop = trimmedWalk(walk, "walk-stop", state.stopTrimFrames, true);
  return [
    makeSegment("idle", clips.get("idle"), state, { holdSeconds: timing.idleLeadSeconds }),
    makeSegment("walk-start", start, state),
    makeSegment("walk-loop", walk, state, { holdSeconds: timing.walkLoopSeconds }),
    makeSegment("walk-stop", stop, state, { speed: 0 }),
    makeSegment("idle", clips.get("idle"), state, { holdSeconds: timing.idleMiddleSeconds }),
    makeSegment("pivot-start", start, state),
    makeSegment("pivot-loop", walk, state, { holdSeconds: timing.pivotLoopSeconds, note: "Facing flips at the pivot boundary." }),
    makeSegment("pivot-stop", stop, state, { speed: 0 }),
  ];
}

function ladder(state, clips) {
  const timing = LAB_TIMELINE.ladder;
  const [walkSlow, walkLive, , runFast, upgrade] = timing.speedsPxPerSec;
  const runEnter = state.runEnterSpeedPxPerSec;
  const runExit = state.runExitSpeedPxPerSec;
  const [slowHold, liveHold, enterHold, fastHold, upgradeHold, exitHold] = timing.phaseSeconds;
  const walk = clips.get("walk");
  const run = clips.get("run");
  return [
    makeSegment("idle", clips.get("idle"), state, { holdSeconds: timing.idleLeadSeconds, speed: 0 }),
    makeSegment(`walk-${walkSlow}`, walk, state, { holdSeconds: slowHold, speed: walkSlow }),
    makeSegment(`walk-${walkLive}`, walk, state, { holdSeconds: liveHold, speed: walkLive }),
    makeSegment(`run-enter-${runEnter}`, run, state, { holdSeconds: enterHold, speed: runEnter }),
    makeSegment(`run-${runFast}`, run, state, { holdSeconds: fastHold, speed: runFast }),
    makeSegment(`upgrade-${upgrade}`, run, state, { holdSeconds: upgradeHold, speed: upgrade }),
    makeSegment(`run-exit-${runExit}`, walk, state, { holdSeconds: exitHold, speed: runExit }),
  ];
}

function air(state, clips) {
  const timing = LAB_TIMELINE.air;
  const landing = trimmedLanding(clips.get("landing"), state.landingFrameCount);
  return [
    makeSegment("airborne-rise", clips.get("airborne"), state, { speed: 0 }),
    makeSegment("airborne-fall", clips.get("falling"), state, { holdSeconds: timing.fallSeconds, speed: 0 }),
    makeSegment("landing", landing, state, { speed: 0 }),
    makeSegment("idle-recover", clips.get("idle"), state, { holdSeconds: timing.idleRecoverSeconds, speed: 0 }),
  ];
}

function flight(state, clips) {
  const timing = LAB_TIMELINE.flight;
  const landing = trimmedLanding(clips.get("landing"), state.landingFrameCount);
  return [
    makeSegment("flight-enter", clips.get("flight-enter"), state),
    makeSegment("flight-hover", clips.get("flight-hover"), state, { holdSeconds: state.flightHoverSeconds }),
    makeSegment("flight-travel-enter", clips.get("flight-travel-enter"), state),
    makeSegment("flight-travel-loop", clips.get("flight-travel"), state, { holdSeconds: state.flightTravelSeconds }),
    makeSegment("flight-exit", clips.get("flight-exit"), state),
    makeSegment("airborne-fall", clips.get("falling"), state, { holdSeconds: timing.fallSeconds, speed: 0 }),
    makeSegment("landing", landing, state, { speed: 0 }),
  ];
}

function mining(state, clips) {
  const aim = state.aim;
  let ids = [...LAB_MINING.sideComboClipIds];
  const repeat = (values) => Array.from(
    { length: LAB_MINING.repeatedHitCount },
    (_, index) => values[index % values.length],
  );
  if (aim.startsWith("UP-")) ids = repeat(LAB_MINING.upSideComboClipIds);
  else if (aim === "UP") ids = repeat(LAB_MINING.upComboClipIds);
  else if (aim.includes("DOWN")) ids = repeat(["dig-down"]);
  const segments = [];
  ids.forEach((id, index) => {
    segments.push(makeSegment(`hit-${index + 1}`, clips.get(id), state, { speed: 0 }));
    segments.push(makeSegment("recovery-gap", clips.get("idle"), state, { speed: 0, holdSeconds: state.comboGapMs / 1000 }));
  });
  return segments;
}

export function buildTimeline(state, assets) {
  const clips = assets.clips;
  let segments;
  if (state.scenarioId === "locomotion") segments = locomotion(state, clips);
  else if (state.scenarioId === "ladder") segments = ladder(state, clips);
  else if (state.scenarioId === "air") segments = air(state, clips);
  else if (state.scenarioId === "flight") segments = flight(state, clips);
  else if (state.scenarioId === "mining") segments = mining(state, clips);
  else {
    const raw = assets.rawClip(state.selectedActionId) || assets.rawClip("idle");
    segments = [makeSegment(`library-${raw.actionId}`, raw, state, {
      speed: 0,
      holdSeconds: raw.loop ? LAB_TIMELINE.libraryLoopSeconds : undefined,
    })];
  }
  let cursor = 0;
  segments.forEach((segment) => {
    segment.start = cursor;
    cursor += segment.duration;
    segment.end = cursor;
  });
  return { segments, duration: Math.max(0.01, cursor) };
}

export function resolveTimelineFrame(timeline, elapsedSeconds) {
  const time = Math.min(Math.max(0, elapsedSeconds), Math.max(0, timeline.duration - 0.00001));
  const segment = timeline.segments.find((entry) => time < entry.end) || timeline.segments.at(-1);
  const localSeconds = Math.max(0, time - segment.start);
  const weighted = weightedFrameSnapshot(segment, localSeconds);
  return {
    segment,
    localSeconds,
    sequenceIndex: weighted.sequenceIndex,
    sourceFrame: weighted.sourceFrame,
    normalized: segment.duration > 0 ? localSeconds / segment.duration : 0,
  };
}

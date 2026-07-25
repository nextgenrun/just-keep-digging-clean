import { resolveFrameHold } from "./labEditorPatch.js";

const FRAME_RATE = 30;
const EPSILON_SECONDS = 0.00001;

export function buildFrameHolds(clip, editorPatch, resolutionScope = "effective") {
  return clip.frames.map((sourceFrame, sequenceIndex) => editorPatch
    ? resolveFrameHold(editorPatch, {
      actionId: clip.actionId, clipId: clip.id ?? clip.actionId,
      animationKey: clip.animationKey ?? clip.id ?? clip.actionId,
      sequenceIndex, sourceFrame,
    }, 0, resolutionScope)
    : 1);
}

export function totalFrameUnits(holds) {
  return Math.max(Number.EPSILON, holds.reduce((total, hold) => total + hold, 0));
}

export function frameIndexAtUnits(holds, units, loop) {
  const total = totalFrameUnits(holds);
  let cursor = loop ? ((units % total) + total) % total : Math.min(total - Number.EPSILON, Math.max(0, units));
  for (let index = 0; index < holds.length; index += 1) {
    if (cursor < holds[index]) return index;
    cursor -= holds[index];
  }
  return Math.max(0, holds.length - 1);
}

export function frameStartUnits(holds, index) {
  return holds.slice(0, Math.max(0, index)).reduce((total, hold) => total + hold, 0);
}

export function frameDurationSeconds(holds, timeScale) {
  return totalFrameUnits(holds) / FRAME_RATE / Math.max(0.01, timeScale);
}

export function weightedFrameSnapshot(segment, localSeconds) {
  const units = localSeconds * FRAME_RATE * segment.timeScale;
  const sequenceIndex = frameIndexAtUnits(segment.frameHolds, units, segment.loop);
  return {
    sequenceIndex,
    sourceFrame: segment.clip.frames[sequenceIndex] ?? 0,
    frameUnits: units,
  };
}

export function adjacentFrameTime(timeline, elapsedSeconds, direction) {
  const time = Math.min(Math.max(0, elapsedSeconds), Math.max(0, timeline.duration - EPSILON_SECONDS));
  const segmentIndex = Math.max(0, timeline.segments.findIndex((entry) => time < entry.end));
  const segment = timeline.segments[segmentIndex] || timeline.segments.at(-1);
  const localSeconds = Math.max(0, time - segment.start);
  const current = weightedFrameSnapshot(segment, localSeconds);
  const count = segment.clip.frames.length;
  let targetIndex = current.sequenceIndex + Math.sign(direction);
  let targetSegment = segment;
  const totalUnits = totalFrameUnits(segment.frameHolds);
  const currentUnits = localSeconds * FRAME_RATE * segment.timeScale;
  const cycleUnits = Math.floor(currentUnits / totalUnits) * totalUnits;
  let targetUnits = null;
  if (targetIndex >= count || targetIndex < 0) {
    const wrappedUnits = direction >= 0
      ? cycleUnits + totalUnits
      : cycleUnits - totalUnits + frameStartUnits(segment.frameHolds, count - 1);
    const wrappedSeconds = wrappedUnits / FRAME_RATE / Math.max(0.01, segment.timeScale);
    if (segment.loop && wrappedUnits >= 0 && wrappedSeconds < segment.duration) {
      targetIndex = direction >= 0 ? 0 : count - 1;
      targetUnits = wrappedUnits;
    } else {
      const nextSegmentIndex = segmentIndex + (direction >= 0 ? 1 : -1);
      targetSegment = timeline.segments[nextSegmentIndex];
      if (!targetSegment) {
        targetSegment = segment;
        targetIndex = direction >= 0 ? 0 : count - 1;
      } else targetIndex = direction >= 0 ? 0 : targetSegment.clip.frames.length - 1;
    }
  }
  const startUnits = targetUnits ?? (targetSegment === segment
    ? cycleUnits + frameStartUnits(targetSegment.frameHolds, targetIndex)
    : frameStartUnits(targetSegment.frameHolds, targetIndex));
  const targetLocal = startUnits / FRAME_RATE / Math.max(0.01, targetSegment.timeScale);
  return Math.min(timeline.duration, targetSegment.start + targetLocal + EPSILON_SECONDS);
}

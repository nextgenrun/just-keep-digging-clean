import { LAB_EDITOR_CONFIG } from "./labConfig.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

export const POSE_DEFAULT = Object.freeze({
  offsetXPx: LAB_EDITOR_CONFIG.defaults.poseOffsetXPx,
  offsetYPx: LAB_EDITOR_CONFIG.defaults.poseOffsetYPx,
  rotationDeg: LAB_EDITOR_CONFIG.defaults.poseRotationDeg,
  scaleX: LAB_EDITOR_CONFIG.defaults.poseScaleX,
  scaleY: LAB_EDITOR_CONFIG.defaults.poseScaleY,
  hold: LAB_EDITOR_CONFIG.defaults.frameHold,
});

export const MARKER_DEFAULT = Object.freeze({
  offsetXPx: LAB_EDITOR_CONFIG.defaults.markerOffsetXPx,
  offsetYPx: LAB_EDITOR_CONFIG.defaults.markerOffsetYPx,
});

export const CONTACT_DEFAULT = Object.freeze({
  forwardOffsetPx: LAB_EDITOR_CONFIG.defaults.contactOffsetXPx,
  normalOffsetPx: LAB_EDITOR_CONFIG.defaults.contactOffsetYPx,
  widthScale: LAB_EDITOR_CONFIG.defaults.contactWidthScale,
  heightScale: LAB_EDITOR_CONFIG.defaults.contactHeightScale,
  markerName: "auto",
});

export function normalizeEditorContext(actionOrContext, sourceFrame = 0) {
  if (typeof actionOrContext === "object") {
    const context = actionOrContext || {};
    return {
      actionId: String(context.actionId),
      clipId: String(context.clipId ?? context.animationKey ?? context.actionId),
      animationKey: String(context.animationKey ?? context.clipId ?? context.actionId),
      sequenceIndex: Math.max(0, Math.round(context.sequenceIndex ?? context.sourceFrame ?? 0)),
      sourceFrame: Math.max(0, Math.round(context.sourceFrame ?? 0)),
    };
  }
  return {
    actionId: String(actionOrContext), clipId: String(actionOrContext),
    animationKey: String(actionOrContext), sequenceIndex: Math.max(0, Math.round(sourceFrame)),
    sourceFrame: Math.max(0, Math.round(sourceFrame)),
  };
}

export function frameKey(actionOrContext, sourceFrame = 0) {
  const context = normalizeEditorContext(actionOrContext, sourceFrame);
  return [context.actionId, context.clipId, context.sequenceIndex, context.sourceFrame]
    .map((part) => encodeURIComponent(part)).join("|");
}

export function parseFrameKey(key) {
  const [actionId, clipId, sequenceIndex, sourceFrame, ...extra] = String(key).split("|").map(decodeURIComponent);
  if (extra.length || !actionId || !clipId) throw new Error(`Invalid frame key ${key}`);
  const sequence = Number(sequenceIndex);
  const source = Number(sourceFrame);
  if (!Number.isInteger(sequence) || sequence < 0 || !Number.isInteger(source) || source < 0) {
    throw new Error(`Invalid frame key ${key}`);
  }
  return normalizeEditorContext({ actionId, clipId, sequenceIndex: sequence, sourceFrame: source });
}

export function createEditorPatch(body) {
  return {
    schema: LAB_EDITOR_CONFIG.schema,
    productionChanged: false,
    visualHandPixelsChanged: false,
    requiresSourceRigRerender: false,
    units: {
      body: "game-px", contact: "direction-local-game-px", marker: "packed-frame-px",
      poseOffset: "game-px", rotation: "degrees", hold: "frame-multiplier",
    },
    body: { widthPx: body.widthPx, heightPx: body.heightPx, offsetXPx: body.offsetXPx, offsetYPx: body.offsetYPx },
    contacts: { actions: {}, frames: {} },
    markers: { actions: {}, frames: {} },
    poses: { actions: {}, frames: {} },
  };
}

function resolveMap(group, defaults, context, resolutionScope) {
  const action = group.actions[context.actionId] || {};
  const frame = resolutionScope === "action" ? {} : group.frames[frameKey(context)] || {};
  return { ...defaults, ...action, ...frame };
}

export function resolvePose(patch, actionOrContext, sourceFrame = 0, bypass = false, resolutionScope = "effective") {
  if (bypass) return { ...POSE_DEFAULT };
  return resolveMap(patch.poses, POSE_DEFAULT, normalizeEditorContext(actionOrContext, sourceFrame), resolutionScope);
}

export function resolveContact(patch, actionOrContext, sourceFrame = 0, bypass = false, resolutionScope = "effective") {
  if (bypass) return { ...CONTACT_DEFAULT };
  return resolveMap(patch.contacts, CONTACT_DEFAULT, normalizeEditorContext(actionOrContext, sourceFrame), resolutionScope);
}

export function resolveMarker(patch, actionOrContext, sourceFrame, markerName, bypass = false, resolutionScope = "effective") {
  if (bypass) return { ...MARKER_DEFAULT };
  const context = normalizeEditorContext(actionOrContext, sourceFrame);
  const action = patch.markers.actions[context.actionId]?.[markerName] || {};
  const frame = resolutionScope === "action" ? {} : patch.markers.frames[frameKey(context)]?.[markerName] || {};
  return { ...MARKER_DEFAULT, ...action, ...frame };
}

export function resolveFrameHold(patch, actionOrContext, sourceFrame = 0, resolutionScope = "effective") {
  return resolvePose(patch, actionOrContext, sourceFrame, false, resolutionScope).hold;
}

function mapForScope(group, context, scope, create) {
  const map = scope === "action" ? group.actions : group.frames;
  const key = scope === "action" ? context.actionId : frameKey(context);
  if (create && !map[key]) map[key] = {};
  return { map, key, record: map[key] };
}

export function setScopedField(patch, groupName, rawContext, scope, field, value, markerName = null) {
  const context = normalizeEditorContext(rawContext);
  const target = mapForScope(patch[groupName], context, scope, true);
  if (groupName === "markers") {
    if (!target.record[markerName]) target.record[markerName] = {};
    target.record[markerName][field] = value;
  } else target.record[field] = value;
}

export function clearScope(patch, rawContext, scope) {
  const context = normalizeEditorContext(rawContext);
  const key = scope === "action" ? context.actionId : frameKey(context);
  [patch.contacts, patch.markers, patch.poses].forEach((group) => {
    delete (scope === "action" ? group.actions : group.frames)[key];
  });
}

export function clearAction(patch, actionId) {
  [patch.contacts, patch.markers, patch.poses].forEach((group) => {
    delete group.actions[actionId];
    Object.keys(group.frames).forEach((key) => {
      if (parseFrameKey(key).actionId === actionId) delete group.frames[key];
    });
  });
}

export function copyResolvedToFrameRange(patch, rawContext, firstIndex, lastIndex, markerName, sourceFrames, markerFrames) {
  const context = normalizeEditorContext(rawContext);
  const pose = resolvePose(patch, context);
  const contact = resolveContact(patch, context);
  const marker = resolveMarker(patch, context, null, markerName);
  const start = Math.min(firstIndex, lastIndex);
  const end = Math.max(firstIndex, lastIndex);
  for (let sequenceIndex = start; sequenceIndex <= end; sequenceIndex += 1) {
    const sourceFrame = sourceFrames[sequenceIndex];
    const frameContext = { ...context, sequenceIndex, sourceFrame };
    const key = frameKey(frameContext);
    patch.poses.frames[key] = { ...pose };
    patch.contacts.frames[key] = { ...contact };
    if (!markerFrames || markerFrames.has(sourceFrame)) {
      patch.markers.frames[key] = { ...(patch.markers.frames[key] || {}), [markerName]: { ...marker } };
    }
  }
}

export function hasMarkerOverrides(patch) {
  return Object.keys(patch.markers.actions).length > 0 || Object.keys(patch.markers.frames).length > 0;
}

export function countOverrides(patch, originalBody) {
  const records = (group) => Object.keys(group.actions).length + Object.keys(group.frames).length;
  const bodyChanged = Object.keys(originalBody).some((key) => patch.body[key] !== originalBody[key]);
  return (bodyChanged ? 1 : 0) + records(patch.contacts) + records(patch.markers) + records(patch.poses);
}

export function hasMarkerOverride(patch, rawContext, sourceFrame, markerName) {
  const context = normalizeEditorContext(rawContext, sourceFrame);
  return own(patch.markers.actions[context.actionId], markerName)
    || own(patch.markers.frames[frameKey(context)], markerName);
}

export function clonePatch(patch) {
  return clone(patch);
}

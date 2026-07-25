import { LAB_CONTROL_BOUNDS, LAB_EDITOR_CONFIG } from "./labConfig.js";
import { clonePatch, hasMarkerOverrides, parseFrameKey, resolveMarker } from "./labEditorPatch.js";

const POSE_FIELDS = Object.freeze(["offsetXPx", "offsetYPx", "rotationDeg", "scaleX", "scaleY", "hold"]);
const CONTACT_FIELDS = Object.freeze(["forwardOffsetPx", "normalOffsetPx", "widthScale", "heightScale", "markerName"]);
const MARKER_FIELDS = Object.freeze(["offsetXPx", "offsetYPx"]);
const EDITABLE_MARKERS = new Set(LAB_EDITOR_CONFIG.editableMarkers);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function assertNumber(value, bounds, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  if (value < bounds.minimum || value > bounds.maximum) throw new Error(`${label} is outside ${bounds.minimum}..${bounds.maximum}`);
}

function fieldBounds(group, field) {
  if (group === "pose") {
    if (field === "rotationDeg") return LAB_CONTROL_BOUNDS.poseRotation;
    if (field === "scaleX" || field === "scaleY") return LAB_CONTROL_BOUNDS.poseScale;
    if (field === "hold") return LAB_CONTROL_BOUNDS.frameHold;
    return LAB_CONTROL_BOUNDS.poseOffset;
  }
  if (group === "contact") return field.endsWith("Scale") ? LAB_CONTROL_BOUNDS.contactAxisScale : LAB_CONTROL_BOUNDS.contactOffset;
  return LAB_CONTROL_BOUNDS.markerOffset;
}

function validateRecord(record, group, label) {
  assertObject(record, label);
  const fields = group === "pose" ? POSE_FIELDS : group === "contact" ? CONTACT_FIELDS : MARKER_FIELDS;
  Object.entries(record).forEach(([field, value]) => {
    if (!fields.includes(field)) throw new Error(`${label}.${field} is not supported`);
    if (field === "markerName") {
      if (value !== "auto" && !EDITABLE_MARKERS.has(value)) throw new Error(`${label}.markerName is invalid`);
    } else assertNumber(value, fieldBounds(group, field), `${label}.${field}`);
  });
}

function validateKey(key, manifest, isFrame) {
  if (!isFrame) {
    if (!Object.hasOwn(manifest.actions, key)) throw new Error(`Unknown action ${key}`);
    return { actionId: key, sourceFrame: null };
  }
  const context = parseFrameKey(key);
  const { actionId, sourceFrame } = context;
  const action = manifest.actions[actionId];
  if (!action) throw new Error(`Unknown frame action ${actionId}`);
  if (!Number.isInteger(sourceFrame) || sourceFrame < 0 || sourceFrame >= action.frame_count) {
    throw new Error(`Invalid frame ${key}`);
  }
  return context;
}

function validateGroup(group, kind, manifest) {
  assertObject(group, `${kind}s`);
  assertObject(group.actions, `${kind}s.actions`);
  assertObject(group.frames, `${kind}s.frames`);
  for (const [scopeName, isFrame] of [["actions", false], ["frames", true]]) {
    Object.entries(group[scopeName]).forEach(([key, record]) => {
      const context = validateKey(key, manifest, isFrame);
      if (kind === "marker") {
        assertObject(record, `markers.${scopeName}.${key}`);
        Object.entries(record).forEach(([markerName, marker]) => {
          if (!EDITABLE_MARKERS.has(markerName)) throw new Error(`Unsupported marker ${markerName}`);
          const action = manifest.actions[context.actionId];
          const markerExists = isFrame
            ? Array.isArray(action.rig_markers?.frames?.[String(context.sourceFrame)]?.[markerName])
            : Object.values(action.rig_markers?.frames || {}).some((markers) => Array.isArray(markers[markerName]));
          if (!markerExists) throw new Error(`Marker ${markerName} has no production source at ${key}`);
          validateRecord(marker, kind, `markers.${scopeName}.${key}.${markerName}`);
        });
      } else validateRecord(record, kind, `${kind}s.${scopeName}.${key}`);
    });
  }
}

function validateBody(body) {
  assertObject(body, "body");
  assertNumber(body.widthPx, LAB_CONTROL_BOUNDS.bodyWidth, "body.widthPx");
  assertNumber(body.heightPx, LAB_CONTROL_BOUNDS.bodyHeight, "body.heightPx");
  assertNumber(body.offsetXPx, LAB_CONTROL_BOUNDS.bodyOffset, "body.offsetXPx");
  assertNumber(body.offsetYPx, LAB_CONTROL_BOUNDS.bodyOffset, "body.offsetYPx");
}

export function validateEditorPatch(candidate, manifest) {
  assertObject(candidate, "patch");
  if (candidate.schema !== LAB_EDITOR_CONFIG.schema) throw new Error(`Expected schema ${LAB_EDITOR_CONFIG.schema}`);
  if (candidate.productionChanged !== false) throw new Error("Imported patch must keep productionChanged false");
  if (candidate.visualHandPixelsChanged !== false) throw new Error("Logical hand edits cannot claim raster changes");
  assertObject(candidate.units, "units");
  validateBody(candidate.body);
  validateGroup(candidate.contacts, "contact", manifest);
  validateGroup(candidate.markers, "marker", manifest);
  validateGroup(candidate.poses, "pose", manifest);
  const validated = clonePatch(candidate);
  validated.requiresSourceRigRerender = hasMarkerOverrides(validated);
  return validated;
}

export function parseEditorPatch(text, manifest) {
  let candidate;
  try { candidate = JSON.parse(text); }
  catch (error) { throw new Error(`Invalid JSON: ${error.message}`); }
  if (candidate.editorPatch) candidate = candidate.editorPatch;
  return validateEditorPatch(candidate, manifest);
}

function sortMap(map) {
  return Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
}

export function serializeEditorPatch(patch) {
  const exported = clonePatch(patch);
  exported.requiresSourceRigRerender = hasMarkerOverrides(exported);
  [exported.contacts, exported.markers, exported.poses].forEach((group) => {
    group.actions = sortMap(group.actions);
    group.frames = sortMap(group.frames);
  });
  return exported;
}

export function buildSourceRigPoseRequests(patch, manifest) {
  const requests = [];
  Object.entries(patch.markers.actions).forEach(([actionId, markers]) => {
    Object.entries(markers).forEach(([markerName, correction]) => requests.push({
      scope: "action", actionId, sourceClip: manifest.actions[actionId]?.source_clip,
      marker: markerName, deltaPackedPx: { x: correction.offsetXPx ?? 0, y: correction.offsetYPx ?? 0 },
      requiresBlenderRerender: true,
    }));
  });
  Object.entries(patch.markers.frames).forEach(([key, markers]) => {
    const context = parseFrameKey(key);
    const action = manifest.actions[context.actionId];
    Object.keys(markers).forEach((markerName) => {
      const base = action.rig_markers.frames[String(context.sourceFrame)][markerName];
      const correction = resolveMarker(patch, context, 0, markerName);
      requests.push({
        scope: "sequence-frame", ...context, sourceClip: action.source_clip, marker: markerName,
        basePackedPx: { x: base[0], y: base[1] },
        goalPackedPx: { x: base[0] + correction.offsetXPx, y: base[1] + correction.offsetYPx },
        deltaPackedPx: { x: correction.offsetXPx, y: correction.offsetYPx },
        movesRasterPixelsInLab: false, requiresBlenderRerender: true,
        requiresUniqueRuntimeFrameForOccurrence: true,
      });
    });
  });
  return requests;
}

import { LAB_CONTROL_BOUNDS, LAB_EDITOR_CONFIG } from "./labConfig.js";
import {
  clearAction,
  clearScope,
  clonePatch,
  copyResolvedToFrameRange,
  countOverrides,
  createEditorPatch,
  hasMarkerOverrides,
  resolveContact,
  resolveMarker,
  resolvePose,
  setScopedField,
} from "./labEditorPatch.js";

const clamp = (value, bounds) => Math.min(bounds.maximum, Math.max(bounds.minimum, Number(value)));
const snapshot = (patch) => JSON.stringify(patch);

function boundsFor(group, field) {
  if (group === "body") {
    if (field === "widthPx") return LAB_CONTROL_BOUNDS.bodyWidth;
    if (field === "heightPx") return LAB_CONTROL_BOUNDS.bodyHeight;
    return LAB_CONTROL_BOUNDS.bodyOffset;
  }
  if (group === "contacts") {
    return field.endsWith("Scale") ? LAB_CONTROL_BOUNDS.contactAxisScale : LAB_CONTROL_BOUNDS.contactOffset;
  }
  if (group === "markers") return LAB_CONTROL_BOUNDS.markerOffset;
  if (field === "rotationDeg") return LAB_CONTROL_BOUNDS.poseRotation;
  if (field === "scaleX" || field === "scaleY") return LAB_CONTROL_BOUNDS.poseScale;
  if (field === "hold") return LAB_CONTROL_BOUNDS.frameHold;
  return LAB_CONTROL_BOUNDS.poseOffset;
}

export class LabEditorModel {
  constructor(state) {
    this.state = state;
    this.originalBody = {
      widthPx: state.bodyWidthPx,
      heightPx: state.bodyHeightPx,
      offsetXPx: state.bodyOffsetXPx,
      offsetYPx: state.bodyOffsetYPx,
    };
    state.editorOriginalBody = { ...this.originalBody };
    state.editorDraft = createEditorPatch(this.originalBody);
    this.context = {
      actionId: state.selectedActionId, clipId: state.selectedActionId,
      animationKey: state.selectedActionId, sequenceIndex: 0, sourceFrame: 0,
    };
    this.undoStack = [];
    this.redoStack = [];
    this.pending = null;
    this.clipboard = null;
    this.onChange = () => {};
  }

  setOnChange(handler) {
    this.onChange = handler || (() => {});
  }

  setContext(actionOrContext, sourceFrame = 0) {
    this.context = typeof actionOrContext === "object"
      ? { ...actionOrContext }
      : {
        actionId: actionOrContext, clipId: actionOrContext, animationKey: actionOrContext,
        sequenceIndex: Math.max(0, Math.round(sourceFrame)), sourceFrame: Math.max(0, Math.round(sourceFrame)),
      };
  }

  beginTransaction(label = "Edit") {
    if (!this.pending) this.pending = { before: snapshot(this.state.editorDraft), label };
  }

  liveMutate(mutator, detail = {}) {
    mutator(this.state.editorDraft);
    this._syncLegacyBody();
    this.onChange({ ...detail, live: true });
  }

  commitTransaction(detail = {}) {
    if (!this.pending) return false;
    const current = snapshot(this.state.editorDraft);
    const changed = current !== this.pending.before;
    if (changed) {
      this.undoStack.push({ patch: this.pending.before, label: this.pending.label });
      if (this.undoStack.length > LAB_EDITOR_CONFIG.historyLimit) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    this.pending = null;
    this.onChange({ ...detail, committed: changed });
    return changed;
  }

  cancelTransaction() {
    if (!this.pending) return false;
    this.state.editorDraft = JSON.parse(this.pending.before);
    this.pending = null;
    this._syncLegacyBody();
    this.onChange({ cancelled: true, rebuild: true });
    return true;
  }

  mutate(label, mutator, detail = {}) {
    this.beginTransaction(label);
    this.liveMutate(mutator, detail);
    return this.commitTransaction(detail);
  }

  setBody(field, value, live = false) {
    const apply = (patch) => { patch.body[field] = clamp(value, boundsFor("body", field)); };
    if (live) this.liveMutate(apply);
    else this.mutate(`Body ${field}`, apply);
  }

  updateBody(fields, live = false) {
    const apply = (patch) => {
      Object.entries(fields).forEach(([field, value]) => {
        patch.body[field] = clamp(value, boundsFor("body", field));
      });
    };
    if (live) this.liveMutate(apply);
    else this.mutate("Body transform", apply);
  }

  setScoped(group, field, value, markerName = this.state.selectedMarker, live = false) {
    const numeric = typeof value === "number" ? clamp(value, boundsFor(group, field)) : value;
    const apply = (patch) => {
      setScopedField(patch, group, this.context, this.state.editorScope, field, numeric, markerName);
      if (group === "markers") patch.requiresSourceRigRerender = true;
    };
    if (live) this.liveMutate(apply, { rebuild: group === "poses" && field === "hold" });
    else this.mutate(`${group} ${field}`, apply, { rebuild: group === "poses" && field === "hold" });
  }

  updateScoped(group, fields, markerName = this.state.selectedMarker, live = false) {
    const apply = (patch) => {
      Object.entries(fields).forEach(([field, value]) => {
        const numeric = typeof value === "number" ? clamp(value, boundsFor(group, field)) : value;
        setScopedField(patch, group, this.context, this.state.editorScope, field, numeric, markerName);
      });
      if (group === "markers") patch.requiresSourceRigRerender = true;
    };
    const detail = { rebuild: group === "poses" && Object.hasOwn(fields, "hold") };
    if (live) this.liveMutate(apply, detail);
    else this.mutate(`${group} transform`, apply, detail);
  }

  resolved() {
    const patch = this.state.editorDraft;
    const bypass = this.state.bypassEdits;
    const resolutionScope = this.state.editorScope === "action" ? "action" : "effective";
    return {
      body: bypass ? { ...this.originalBody } : { ...patch.body },
      pose: resolvePose(patch, this.context, 0, bypass, resolutionScope),
      contact: resolveContact(patch, this.context, 0, bypass, resolutionScope),
      marker: resolveMarker(patch, this.context, 0, this.state.selectedMarker, bypass, resolutionScope),
    };
  }

  copyCurrent() {
    const resolved = this.resolved();
    const tool = this.state.editorTool;
    const value = tool === "body" ? this.state.editorDraft.body
      : tool === "pose" ? resolved.pose : tool === "contact" ? resolved.contact : resolved.marker;
    this.clipboard = clonePatch({ tool, value });
    this.onChange({ copied: true });
  }

  pasteCurrent() {
    if (!this.clipboard) return false;
    return this.mutate("Paste override", (patch) => {
      const group = { pose: "poses", contact: "contacts", hand: "markers" }[this.clipboard.tool];
      if (this.clipboard.tool === "body") Object.assign(patch.body, this.clipboard.value);
      else Object.entries(this.clipboard.value).forEach(([field, value]) => {
        setScopedField(patch, group, this.context, this.state.editorScope, field, value, this.state.selectedMarker);
      });
    }, { rebuild: true });
  }

  copyToRange(firstFrame, lastFrame, sourceFrames, markerFrames = null) {
    const maximumFrame = Math.max(0, Math.min(
      sourceFrames.length - 1,
      LAB_EDITOR_CONFIG.interaction.maximumRangeFrames - 1,
    ));
    const clampFrame = (value) => Math.min(maximumFrame, Math.max(0, Math.round(Number(value) || 0)));
    const first = clampFrame(firstFrame);
    const last = clampFrame(lastFrame);
    return this.mutate("Copy override to range", (patch) => {
      copyResolvedToFrameRange(patch, this.context, first, last, this.state.selectedMarker, sourceFrames, markerFrames);
      patch.requiresSourceRigRerender = true;
    }, { rebuild: true });
  }

  resetScope() {
    return this.mutate("Reset scope", (patch) => {
      if (this.state.editorTool === "body") Object.assign(patch.body, this.originalBody);
      else clearScope(patch, this.context, this.state.editorScope);
    }, { rebuild: true });
  }

  resetAction() {
    return this.mutate("Reset action", (patch) => {
      if (this.state.editorTool === "body") Object.assign(patch.body, this.originalBody);
      else clearAction(patch, this.context.actionId);
    }, { rebuild: true });
  }

  resetAll() {
    return this.mutate("Reset all", () => {
      this.state.editorDraft = createEditorPatch(this.originalBody);
    }, { rebuild: true });
  }

  replacePatch(patch) {
    return this.mutate("Import patch", () => { this.state.editorDraft = clonePatch(patch); }, { rebuild: true });
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push({ patch: snapshot(this.state.editorDraft), label: "Redo" });
    this.state.editorDraft = JSON.parse(this.undoStack.pop().patch);
    this._syncLegacyBody();
    this.onChange({ undo: true, rebuild: true });
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push({ patch: snapshot(this.state.editorDraft), label: "Undo" });
    this.state.editorDraft = JSON.parse(this.redoStack.pop().patch);
    this._syncLegacyBody();
    this.onChange({ redo: true, rebuild: true });
    return true;
  }

  summary() {
    return {
      count: countOverrides(this.state.editorDraft, this.originalBody),
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      context: { ...this.context },
    };
  }

  _syncLegacyBody() {
    const body = this.state.editorDraft.body;
    this.state.editorDraft.requiresSourceRigRerender = hasMarkerOverrides(this.state.editorDraft);
    this.state.bodyWidthPx = body.widthPx;
    this.state.bodyHeightPx = body.heightPx;
    this.state.bodyOffsetXPx = body.offsetXPx;
    this.state.bodyOffsetYPx = body.offsetYPx;
  }
}

import { LAB_CONTROL_BOUNDS, LAB_EDITOR_CONFIG } from "./labConfig.js";
import { parseEditorPatch } from "./labEditorPatchIo.js";

const $ = (selector) => document.querySelector(selector);

const FIELD_BINDINGS = Object.freeze([
  ["body-width", "body", "widthPx", LAB_CONTROL_BOUNDS.bodyWidth],
  ["body-height", "body", "heightPx", LAB_CONTROL_BOUNDS.bodyHeight],
  ["body-offset-x", "body", "offsetXPx", LAB_CONTROL_BOUNDS.bodyOffset],
  ["body-offset-y", "body", "offsetYPx", LAB_CONTROL_BOUNDS.bodyOffset],
  ["contact-forward", "contacts", "forwardOffsetPx", LAB_CONTROL_BOUNDS.contactOffset],
  ["contact-normal", "contacts", "normalOffsetPx", LAB_CONTROL_BOUNDS.contactOffset],
  ["contact-width-scale", "contacts", "widthScale", LAB_CONTROL_BOUNDS.contactAxisScale],
  ["contact-height-scale", "contacts", "heightScale", LAB_CONTROL_BOUNDS.contactAxisScale],
  ["hand-offset-x", "markers", "offsetXPx", LAB_CONTROL_BOUNDS.markerOffset],
  ["hand-offset-y", "markers", "offsetYPx", LAB_CONTROL_BOUNDS.markerOffset],
  ["pose-offset-x", "poses", "offsetXPx", LAB_CONTROL_BOUNDS.poseOffset],
  ["pose-offset-y", "poses", "offsetYPx", LAB_CONTROL_BOUNDS.poseOffset],
  ["pose-rotation", "poses", "rotationDeg", LAB_CONTROL_BOUNDS.poseRotation],
  ["pose-scale-x", "poses", "scaleX", LAB_CONTROL_BOUNDS.poseScale],
  ["pose-scale-y", "poses", "scaleY", LAB_CONTROL_BOUNDS.poseScale],
  ["frame-hold", "poses", "hold", LAB_CONTROL_BOUNDS.frameHold],
]);

const TOOL_LABELS = Object.freeze({
  body: "Body collider", contact: "Attack contact", hand: "Logical hand marker", pose: "Whole-frame pose",
});

export class LabEditorUi {
  constructor(state, model, manifest, handlers) {
    this.state = state;
    this.model = model;
    this.manifest = manifest;
    this.handlers = handlers;
    this.lastContextKey = "";
    this.rangeClipKey = "";
    this.currentClipFrames = [];
    this.needsSync = true;
    this._applyBounds();
    this._bindTools();
    this._bindFields();
    this._bindActions();
    this.sync();
  }

  markDirty() {
    this.needsSync = true;
  }

  _applyBounds() {
    FIELD_BINDINGS.forEach(([id, , , bounds]) => {
      const element = $(`#${id}`);
      element.min = String(bounds.minimum);
      element.max = String(bounds.maximum);
      element.step = String(bounds.step);
    });
  }

  _bindTools() {
    document.querySelectorAll("[data-editor-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        this.state.editorTool = button.dataset.editorTool;
        this.state.playing = false;
        this.sync();
        $("#stage").focus();
      });
    });
    $("#editor-scope").addEventListener("change", () => {
      this.state.editorScope = $("#editor-scope").value;
      this.sync();
    });
    $("#hand-marker").addEventListener("change", () => {
      this.state.selectedMarker = $("#hand-marker").value;
      this.sync();
    });
  }

  _write(group, field, value, live) {
    if (group === "body") this.model.setBody(field, value, live);
    else this.model.setScoped(group, field, value, this.state.selectedMarker, live);
  }

  _bindFields() {
    FIELD_BINDINGS.forEach(([id, group, field]) => {
      const element = $(`#${id}`);
      element.addEventListener("focus", () => {
        this.state.playing = false;
        this.editingContext = { ...this.model.context };
        this.model.beginTransaction(`Edit ${field}`);
      });
      element.addEventListener("input", () => {
        if (!this.model.pending) this.model.beginTransaction(`Edit ${field}`);
        this._write(group, field, Number(element.value), true);
      });
      element.addEventListener("change", () => this.model.commitTransaction({ rebuild: field === "hold" }));
      element.addEventListener("blur", () => {
        this.model.commitTransaction({ rebuild: field === "hold" });
        this.editingContext = null;
      });
    });
    $("#contact-marker").addEventListener("change", () => {
      this.state.playing = false;
      this.model.setScoped("contacts", "markerName", $("#contact-marker").value);
    });
  }

  _bindActions() {
    $("#snap-enabled").addEventListener("change", () => { this.state.snapToPixels = $("#snap-enabled").checked; });
    $("#production-ghost").addEventListener("change", () => { this.state.showProductionGhost = $("#production-ghost").checked; });
    $("#bypass-edits").addEventListener("change", () => { this.state.bypassEdits = $("#bypass-edits").checked; this.sync(); });
    $("#undo-edit").addEventListener("click", () => this.model.undo());
    $("#redo-edit").addEventListener("click", () => this.model.redo());
    $("#copy-override").addEventListener("click", () => this.model.copyCurrent());
    $("#paste-override").addEventListener("click", () => { this.state.playing = false; this.model.pasteCurrent(); });
    $("#clear-override").addEventListener("click", () => { this.state.playing = false; this.model.resetScope(); });
    $("#reset-action").addEventListener("click", () => { this.state.playing = false; this.model.resetAction(); });
    $("#reset-all-editor").addEventListener("click", () => { this.state.playing = false; this.model.resetAll(); });
    $("#apply-range").addEventListener("click", () => {
      this.state.playing = false;
      const start = Number($("#range-start").value);
      const end = Number($("#range-end").value);
      const action = this.manifest.actions[this.model.context.actionId];
      const markerFrames = new Set(Object.entries(action.rig_markers?.frames || {})
        .filter(([, markers]) => Array.isArray(markers[this.state.selectedMarker]))
        .map(([sourceFrame]) => Number(sourceFrame)));
      this.model.copyToRange(start, end, this.currentClipFrames, markerFrames);
    });
    $("#apply-import").addEventListener("click", () => {
      this.state.playing = false;
      const error = $("#import-error");
      try {
        const patch = parseEditorPatch($("#import-json").value, this.manifest);
        this.model.replacePatch(patch);
        error.textContent = "Imported · production unchanged";
        error.classList.add("success");
      } catch (caught) {
        error.textContent = caught.message;
        error.classList.remove("success");
      }
    });
  }

  _setValue(id, value) {
    const element = $(`#${id}`);
    if (document.activeElement !== element) element.value = String(value);
  }

  sync() {
    const resolved = this.model.resolved();
    const mappings = {
      "body-width": resolved.body.widthPx, "body-height": resolved.body.heightPx,
      "body-offset-x": resolved.body.offsetXPx, "body-offset-y": resolved.body.offsetYPx,
      "contact-forward": resolved.contact.forwardOffsetPx, "contact-normal": resolved.contact.normalOffsetPx,
      "contact-width-scale": resolved.contact.widthScale, "contact-height-scale": resolved.contact.heightScale,
      "contact-marker": resolved.contact.markerName,
      "hand-offset-x": resolved.marker.offsetXPx, "hand-offset-y": resolved.marker.offsetYPx,
      "pose-offset-x": resolved.pose.offsetXPx, "pose-offset-y": resolved.pose.offsetYPx,
      "pose-rotation": resolved.pose.rotationDeg, "pose-scale-x": resolved.pose.scaleX,
      "pose-scale-y": resolved.pose.scaleY, "frame-hold": resolved.pose.hold,
      "editor-scope": this.state.editorScope, "hand-marker": this.state.selectedMarker,
    };
    Object.entries(mappings).forEach(([id, value]) => this._setValue(id, value));
    document.querySelectorAll("[data-editor-tool]").forEach((button) => {
      const active = button.dataset.editorTool === this.state.editorTool;
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-tool-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.toolPanel !== this.state.editorTool;
    });
    $("#snap-enabled").checked = this.state.snapToPixels;
    $("#production-ghost").checked = this.state.showProductionGhost;
    $("#bypass-edits").checked = this.state.bypassEdits;
    const locked = this.state.bypassEdits;
    FIELD_BINDINGS.forEach(([id]) => { $(`#${id}`).disabled = locked; });
    ["contact-marker", "apply-range", "paste-override", "clear-override", "reset-action", "reset-all-editor"].forEach((id) => {
      $(`#${id}`).disabled = locked;
    });
    $("#editor-scope").disabled = this.state.editorTool === "body";
    $("#apply-range").disabled = locked || this.state.editorTool === "body";
    $("#editor-selection").textContent = TOOL_LABELS[this.state.editorTool];
    const summary = this.model.summary();
    $("#override-count").textContent = `${summary.count} override${summary.count === 1 ? "" : "s"}`;
    $("#undo-edit").disabled = !summary.canUndo;
    $("#redo-edit").disabled = !summary.canRedo;
    this.needsSync = false;
  }

  update(snapshot, renderMeta) {
    const editingField = Boolean(this.editingContext);
    const clip = snapshot.segment.clip;
    const context = {
      actionId: clip.actionId, clipId: clip.id, animationKey: clip.animationKey,
      sequenceIndex: snapshot.sequenceIndex, sourceFrame: snapshot.sourceFrame,
    };
    if (!editingField) this.model.setContext(context);
    const contextKey = `${clip.actionId}:${clip.id}:${snapshot.sequenceIndex}:${snapshot.sourceFrame}:${this.state.selectedMarker}`;
    if ((this.needsSync || contextKey !== this.lastContextKey) && !editingField) this.sync();
    this.lastContextKey = contextKey;
    $("#editor-context").textContent = this.state.editorTool === "body"
      ? "global physics body · production anchor"
      : `${clip.actionId} · sequence ${snapshot.sequenceIndex} · source ${snapshot.sourceFrame} · ${this.state.editorScope}`;
    this.currentClipFrames = Array.from(clip.frames);
    const maximum = Math.max(0, clip.frames.length - 1);
    $("#range-start").max = String(maximum);
    $("#range-end").max = String(maximum);
    const nextRangeKey = `${clip.actionId}:${clip.id}`;
    if (nextRangeKey !== this.rangeClipKey) {
      $("#range-start").value = String(snapshot.sequenceIndex);
      $("#range-end").value = String(snapshot.sequenceIndex);
      this.rangeClipKey = nextRangeKey;
    } else {
      ["#range-start", "#range-end"].forEach((id) => {
        const element = $(id);
        if (document.activeElement !== element) element.value = String(Math.min(maximum, Math.max(0, Math.round(Number(element.value) || 0))));
      });
    }
    const markerAvailable = Boolean(renderMeta.interaction?.markers[this.state.selectedMarker]);
    ["#hand-offset-x", "#hand-offset-y"].forEach((id) => { $(id).disabled = this.state.bypassEdits || !markerAvailable; });
    $("#hand-edit-warning").classList.toggle("missing", !markerAvailable);
    if (!markerAvailable) $("#hand-edit-warning").textContent = "No production marker exists on this frame. Select a marker-backed frame; the lab will not invent coverage.";
    else $("#hand-edit-warning").textContent = "Moves contact/rig metadata only. Individual arm pixels require a Blender source-rig rerender.";
    const contactAvailable = Boolean(renderMeta.interaction?.contactRect);
    ["#contact-forward", "#contact-normal", "#contact-width-scale", "#contact-height-scale", "#contact-marker"].forEach((id) => {
      $(id).disabled = this.state.bypassEdits || !contactAvailable;
    });
    const reason = this.state.bypassEdits
      ? "Bypass is read-only; turn it off to edit."
      : this.state.editorTool === "hand" && !markerAvailable
        ? "Selected hand has no production marker on this sequence frame."
        : this.state.editorTool === "contact" && !contactAvailable
          ? "This sequence frame has no editable action contact."
          : "";
    $("#editor-disabled-reason").textContent = reason;
  }
}

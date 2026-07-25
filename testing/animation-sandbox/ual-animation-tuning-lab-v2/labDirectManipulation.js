import { LAB_EDITOR_CONFIG } from "./labConfig.js";
import { boxHandles, inverseScreenDelta } from "./labStageGeometry.js";

const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const inside = (point, rect) => point.x >= rect.x && point.x <= rect.x + rect.width
  && point.y >= rect.y && point.y <= rect.y + rect.height;

function normalizedBounds(bounds) {
  return { x: bounds.x, y: bounds.y, width: bounds.right - bounds.x, height: bounds.bottom - bounds.y };
}

export function hitBox(point, rect) {
  const radius = LAB_EDITOR_CONFIG.interaction.handleRadiusPx + LAB_EDITOR_CONFIG.interaction.boxHitPaddingPx;
  const handles = boxHandles(rect);
  if (distance(point, handles.move) <= LAB_EDITOR_CONFIG.interaction.handleRadiusPx) return "move";
  const handle = Object.entries(handles).find(([name, position]) => name !== "move" && distance(point, position) <= radius);
  if (handle) return handle[0];
  return inside(point, rect) ? "move" : null;
}

function resizeRect(rect, handle, delta, minimum) {
  const next = { ...rect };
  if (handle.includes("w")) { next.x += delta.x; next.width -= delta.x; }
  if (handle.includes("e")) next.width += delta.x;
  if (handle.includes("n")) { next.y += delta.y; next.height -= delta.y; }
  if (handle.includes("s")) next.height += delta.y;
  if (next.width < minimum) {
    if (handle.includes("w")) next.x -= minimum - next.width;
    next.width = minimum;
  }
  if (next.height < minimum) {
    if (handle.includes("n")) next.y -= minimum - next.height;
    next.height = minimum;
  }
  return next;
}

export class LabDirectManipulation {
  constructor(canvas, state, model, getInteraction) {
    this.canvas = canvas;
    this.state = state;
    this.model = model;
    this.getInteraction = getInteraction;
    this.drag = null;
    canvas.addEventListener("pointerdown", (event) => this._pointerDown(event));
    canvas.addEventListener("pointermove", (event) => this._pointerMove(event));
    canvas.addEventListener("pointerup", (event) => this._pointerUp(event));
    canvas.addEventListener("pointercancel", () => this._cancel());
    canvas.addEventListener("keydown", (event) => this._keyDown(event));
  }

  _point(event, interaction) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * interaction.width / rect.width,
      y: (event.clientY - rect.top) * interaction.height / rect.height,
    };
  }

  _hit(point, interaction) {
    if (this.state.editorTool === "body") return hitBox(point, interaction.bodyRect);
    if (this.state.editorTool === "contact") return interaction.contactRect && hitBox(point, interaction.contactRect);
    if (this.state.editorTool === "pose") return inside(point, normalizedBounds(interaction.spriteBounds)) ? "move" : null;
    if (this.state.editorTool === "hand") {
      const marker = Object.entries(interaction.markers)
        .filter(([name]) => LAB_EDITOR_CONFIG.editableMarkers.includes(name))
        .sort(([, left], [, right]) => distance(point, left) - distance(point, right))[0];
      if (marker && distance(point, marker[1]) <= LAB_EDITOR_CONFIG.interaction.markerRadiusPx + LAB_EDITOR_CONFIG.interaction.hitPaddingPx) {
        this.state.selectedMarker = marker[0];
        return "marker";
      }
    }
    return null;
  }

  _pointerDown(event) {
    if (this.state.bypassEdits) return;
    const interaction = this.getInteraction();
    if (!interaction) return;
    const point = this._point(event, interaction);
    const handle = this._hit(point, interaction);
    if (!handle) return;
    event.preventDefault();
    this.state.playing = false;
    this.canvas.focus();
    this.canvas.setPointerCapture(event.pointerId);
    this.model.setContext(interaction.context);
    this.model.beginTransaction(`Drag ${this.state.editorTool}`);
    this.drag = {
      pointerId: event.pointerId,
      point,
      handle,
      interaction,
      resolved: this.model.resolved(),
    };
  }

  _pointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    const point = this._point(event, this.drag.interaction);
    const delta = { x: point.x - this.drag.point.x, y: point.y - this.drag.point.y };
    this._applyDrag(point, delta);
  }

  _applyDrag(point, delta) {
    const { interaction, handle, resolved } = this.drag;
    const snap = (value) => this.state.snapToPixels ? Math.round(value) : Math.round(value * 100) / 100;
    if (this.state.editorTool === "body") {
      if (handle === "move") {
        this.model.updateBody({
          offsetXPx: snap(resolved.body.offsetXPx + delta.x / interaction.zoom),
          offsetYPx: snap(resolved.body.offsetYPx + delta.y / interaction.zoom),
        }, true);
      } else {
        const rect = resizeRect(interaction.bodyRect, handle, delta, LAB_EDITOR_CONFIG.interaction.minimumBoxPx * interaction.zoom);
        this.model.updateBody({
          widthPx: snap(rect.width / interaction.zoom),
          heightPx: snap(rect.height / interaction.zoom),
          offsetXPx: snap((rect.x + rect.width / 2 - interaction.width / 2) / interaction.zoom),
          offsetYPx: snap((rect.y + rect.height - interaction.groundY) / interaction.zoom),
        }, true);
      }
      return;
    }
    if (this.state.editorTool === "contact") {
      const { forward, normal } = interaction.contactRect;
      if (handle === "move") {
        this.model.updateScoped("contacts", {
          forwardOffsetPx: snap(resolved.contact.forwardOffsetPx + (delta.x * forward.x + delta.y * forward.y) / interaction.zoom),
          normalOffsetPx: snap(resolved.contact.normalOffsetPx + (delta.x * normal.x + delta.y * normal.y) / interaction.zoom),
        }, undefined, true);
      } else {
        const start = interaction.contactRect;
        const rect = resizeRect(start, handle, delta, LAB_EDITOR_CONFIG.interaction.minimumBoxPx * interaction.zoom);
        const centerDelta = {
          x: rect.x + rect.width / 2 - (start.x + start.width / 2),
          y: rect.y + rect.height / 2 - (start.y + start.height / 2),
        };
        this.model.updateScoped("contacts", {
          forwardOffsetPx: snap(resolved.contact.forwardOffsetPx + (centerDelta.x * forward.x + centerDelta.y * forward.y) / interaction.zoom),
          normalOffsetPx: snap(resolved.contact.normalOffsetPx + (centerDelta.x * normal.x + centerDelta.y * normal.y) / interaction.zoom),
          widthScale: snap(resolved.contact.widthScale * rect.width / start.width),
          heightScale: snap(resolved.contact.heightScale * rect.height / start.height),
        }, undefined, true);
      }
      return;
    }
    if (this.state.editorTool === "hand") {
      const source = inverseScreenDelta(delta, interaction.geometry, interaction.action);
      this.model.updateScoped("markers", {
        offsetXPx: snap(resolved.marker.offsetXPx + source.x),
        offsetYPx: snap(resolved.marker.offsetYPx + source.y),
      }, this.state.selectedMarker, true);
      return;
    }
    if (handle === "move") {
      this.model.updateScoped("poses", {
        offsetXPx: snap(resolved.pose.offsetXPx + delta.x / interaction.zoom),
        offsetYPx: snap(resolved.pose.offsetYPx + delta.y / interaction.zoom),
      }, undefined, true);
    }
  }

  _pointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.drag = null;
    this.model.commitTransaction({ rebuild: false });
  }

  _cancel() {
    if (!this.drag) return;
    this.drag = null;
    this.model.cancelTransaction();
  }

  _keyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) this.model.redo(); else this.model.undo();
      return;
    }
    if (this.state.bypassEdits) return;
    if (event.key === "Escape") { event.preventDefault(); this._cancel(); return; }
    if (event.key === "Delete") { event.preventDefault(); this.model.resetScope(); return; }
    const direction = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    const amount = event.shiftKey ? LAB_EDITOR_CONFIG.interaction.largeNudgePx : LAB_EDITOR_CONFIG.interaction.nudgePx;
    this._nudge(direction.x * amount, direction.y * amount);
  }

  _nudge(x, y) {
    const interaction = this.getInteraction();
    if (!interaction) return;
    this.model.setContext(interaction.context);
    const resolved = this.model.resolved();
    if (this.state.editorTool === "body") this.model.updateBody({ offsetXPx: resolved.body.offsetXPx + x, offsetYPx: resolved.body.offsetYPx + y });
    else if (this.state.editorTool === "pose") this.model.updateScoped("poses", { offsetXPx: resolved.pose.offsetXPx + x, offsetYPx: resolved.pose.offsetYPx + y });
    else if (this.state.editorTool === "hand") {
      const source = inverseScreenDelta({ x: x * interaction.zoom, y: y * interaction.zoom }, interaction.geometry, interaction.action);
      this.model.updateScoped("markers", { offsetXPx: resolved.marker.offsetXPx + source.x, offsetYPx: resolved.marker.offsetYPx + source.y });
    } else if (interaction.contactRect) {
      const { forward, normal } = interaction.contactRect;
      this.model.updateScoped("contacts", {
        forwardOffsetPx: resolved.contact.forwardOffsetPx + x * forward.x + y * forward.y,
        normalOffsetPx: resolved.contact.normalOffsetPx + x * normal.x + y * normal.y,
      });
    }
  }
}

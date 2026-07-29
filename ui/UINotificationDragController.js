import { USER_SETTINGS } from "../systems/UserSettings.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampPoint(point, bounds) {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

export function createNotificationDragBounds({
  viewportWidth,
  viewportHeight,
  cardWidth,
  cardHeight,
  scale = 1,
}) {
  const drag = UI_NOTIFICATION_CAROUSEL_CONFIG.drag;
  const halfWidth = cardWidth / 2;
  const halfHeight = cardHeight / 2;
  let minX = drag.sideInsetPx * scale + halfWidth;
  let maxX = viewportWidth - drag.sideInsetPx * scale - halfWidth;
  let minY = drag.topReservedPx * scale + halfHeight;
  let maxY = viewportHeight - drag.bottomReservedPx * scale - halfHeight;

  if (maxX < minX) minX = maxX = viewportWidth / 2;
  if (maxY < minY) minY = maxY = viewportHeight / 2;
  return Object.freeze({ minX, maxX, minY, maxY });
}

export function resolveNotificationDragPosition(normalized, bounds) {
  const xRatio = clamp(Number(normalized?.x) || 0, 0, 1);
  const yRatio = clamp(Number(normalized?.y) || 0, 0, 1);
  return {
    x: bounds.minX + (bounds.maxX - bounds.minX) * xRatio,
    y: bounds.minY + (bounds.maxY - bounds.minY) * yRatio,
  };
}

export function normalizeNotificationDragPosition(point, bounds) {
  const xSpan = bounds.maxX - bounds.minX;
  const ySpan = bounds.maxY - bounds.minY;
  return {
    x: xSpan > 0
      ? clamp((point.x - bounds.minX) / xSpan, 0, 1)
      : UI_NOTIFICATION_CAROUSEL_CONFIG.drag.collapsedAxisRatio,
    y: ySpan > 0
      ? clamp((point.y - bounds.minY) / ySpan, 0, 1)
      : UI_NOTIFICATION_CAROUSEL_CONFIG.drag.collapsedAxisRatio,
  };
}

/**
 * Owns pointer dragging and the player's normalized notification-card position.
 */
export class UINotificationDragController {
  constructor(scene, view, callbacks = {}) {
    this.scene = scene;
    this.view = view;
    this.root = view.root;
    this.callbacks = callbacks;
    this.dragging = false;
    this.pointerDown = false;
    this.pointerId = null;
    this.pointerOffsetX = 0;
    this.pointerOffsetY = 0;
    this.avoidanceOffsetY = 0;
    this.savedPosition = USER_SETTINGS.getDisplay().notificationPosition;
    this._createDragZone();
  }

  get isInteracting() {
    return this.pointerDown || this.dragging;
  }

  resolvePosition(defaultX, defaultY, avoidanceOffsetY = 0) {
    this._syncGeometry();
    this.avoidanceOffsetY = Number.isFinite(avoidanceOffsetY)
      ? avoidanceOffsetY
      : 0;
    const bounds = this._bounds();
    if (!this.savedPosition) {
      return clampPoint({ x: defaultX, y: defaultY }, bounds);
    }
    const saved = resolveNotificationDragPosition(this.savedPosition, bounds);
    return clampPoint({
      x: saved.x,
      y: saved.y + this.avoidanceOffsetY,
    }, bounds);
  }

  _createDragZone() {
    const drag = UI_NOTIFICATION_CAROUSEL_CONFIG.drag;
    this.zone = this.scene.add.zone(0, 0, 1, 1)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ cursor: drag.idleCursor });
    if (typeof this.root.addAt === "function") {
      this.root.addAt(this.zone, 1);
    } else {
      this.root.add(this.zone);
    }
    this.scene.input.setDraggable(this.zone, true);
    this.zone.on("pointerdown", this._onPointerDown, this);
    this.zone.on("pointerup", this._onPointerUp, this);
    this.zone.on("pointerupoutside", this._onPointerUp, this);
    this.zone.on("dragstart", this._onDragStart, this);
    this.zone.on("drag", this._onDrag, this);
    this.zone.on("dragend", this._onDragEnd, this);
    this.scene.input.on("gameout", this._onGameOut, this);
    this._syncGeometry();
  }

  _syncGeometry() {
    const width = this.view.layout?.width || 1;
    const height = this.view.cardHeight || this.view.layout?.minHeight || 1;
    if (width === this.zone?.width && height === this.zone?.height) return;
    this.zone?.setSize(width, height);
  }

  _bounds() {
    const reference = this.scene.config || {};
    return createNotificationDragBounds({
      viewportWidth: this.scene.scale?.width || reference.viewportWidth || 1280,
      viewportHeight: this.scene.scale?.height || reference.viewportHeight || 720,
      cardWidth: this.view.layout?.width || 1,
      cardHeight: this.view.cardHeight || this.view.layout?.minHeight || 1,
      scale: this.view.scale || 1,
    });
  }

  _onPointerDown(pointer, _localX, _localY, event) {
    event?.stopPropagation?.();
    this.callbacks.onInteractionStart?.();
    this.pointerDown = true;
    this.pointerId = pointer?.id ?? null;
    this.pointerOffsetX = (pointer?.x ?? this.root.x) - this.root.x;
    this.pointerOffsetY = (pointer?.y ?? this.root.y) - this.root.y;
  }

  _onPointerUp(pointer, _localX, _localY, event) {
    event?.stopPropagation?.();
    if (!this._matchesPointer(pointer)) return;
    this._finishInteraction();
  }

  _onDragStart(pointer) {
    if (!this.pointerDown) this._onPointerDown(pointer);
    this.dragging = true;
    this._setCursor(UI_NOTIFICATION_CAROUSEL_CONFIG.drag.activeCursor);
  }

  _onDrag(pointer) {
    if (!this._matchesPointer(pointer)) return;
    const bounds = this._bounds();
    const next = clampPoint({
      x: (pointer?.x ?? this.root.x) - this.pointerOffsetX,
      y: (pointer?.y ?? this.root.y) - this.pointerOffsetY,
    }, bounds);
    this.root.setPosition(next.x, next.y);
  }

  _onDragEnd(pointer) {
    if (!this._matchesPointer(pointer)) return;
    this._finishInteraction();
  }

  _onGameOut() {
    if (this.isInteracting) this._finishInteraction();
  }

  _finishInteraction() {
    if (!this.isInteracting) return;
    if (this.dragging) this._savePosition();
    this.dragging = false;
    this.pointerDown = false;
    this.pointerId = null;
    this._setCursor(UI_NOTIFICATION_CAROUSEL_CONFIG.drag.idleCursor);
    this.callbacks.onInteractionEnd?.();
  }

  _savePosition() {
    const bounds = this._bounds();
    const basePoint = clampPoint({
      x: this.root.x,
      y: this.root.y - this.avoidanceOffsetY,
    }, bounds);
    this.savedPosition = normalizeNotificationDragPosition(basePoint, bounds);
    USER_SETTINGS.updateDisplay({
      notificationPosition: this.savedPosition,
    });
  }

  _matchesPointer(pointer) {
    return this.pointerId == null || pointer?.id == null || pointer.id === this.pointerId;
  }

  _setCursor(cursor) {
    if (this.zone?.input) this.zone.input.cursor = cursor;
  }

  destroy() {
    this.zone?.removeAllListeners();
    this.zone?.disableInteractive();
    this.scene?.input?.off?.("gameout", this._onGameOut, this);
    this.scene = null;
    this.view = null;
    this.root = null;
    this.callbacks = null;
    this.zone = null;
  }
}

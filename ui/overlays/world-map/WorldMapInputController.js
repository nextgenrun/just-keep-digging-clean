import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

/** Owns world-map drag, wheel, and keyboard navigation input. */
export class WorldMapInputController {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.zone = null;
    this.dragPointerId = null;
    this.lastPointer = null;

    scene.input.on("wheel", this._onWheel, this);
    scene.input.on("pointermove", this._onPointerMove, this);
    scene.input.on("pointerup", this._onPointerUp, this);
    scene.input.on("gameout", this._onGameOut, this);
    scene.input.keyboard.on("keydown", this._onKeyDown, this);
  }

  bindViewport(zone) {
    this.unbindViewport();
    this.zone = zone;
    if (this.zone?.input) this.zone.input.cursor = WORLD_MAP_CONFIG.input.idleCursor;
    this.zone?.on?.("pointerdown", this._onPointerDown, this);
    this.zone?.on?.("pointerupoutside", this._onPointerUp, this);
  }

  unbindViewport() {
    this.cancelDrag();
    this.zone?.off?.("pointerdown", this._onPointerDown, this);
    this.zone?.off?.("pointerupoutside", this._onPointerUp, this);
    this.zone = null;
  }

  _isOpen() {
    return this.callbacks?.isOpen?.() === true;
  }

  _onPointerDown(pointer, _localX, _localY, event) {
    event?.stopPropagation?.();
    if (!this._isOpen()) return;
    this.dragPointerId = pointer?.id ?? null;
    this.lastPointer = { x: pointer?.x || 0, y: pointer?.y || 0 };
    this._setCursor(WORLD_MAP_CONFIG.input.activeCursor);
  }

  _onPointerMove(pointer) {
    if (!this._isOpen() || !this.lastPointer || !this._matchesPointer(pointer)) return;
    const next = { x: pointer?.x || 0, y: pointer?.y || 0 };
    this.callbacks?.panByPixels?.(
      next.x - this.lastPointer.x,
      next.y - this.lastPointer.y,
    );
    this.lastPointer = next;
  }

  _onPointerUp(pointer, _localX, _localY, event) {
    event?.stopPropagation?.();
    if (!this.lastPointer || !this._matchesPointer(pointer)) return;
    this.cancelDrag();
  }

  _onGameOut() {
    this.cancelDrag();
  }

  _onWheel(pointer, _objects, _deltaX, deltaY) {
    if (!this._isOpen() || !deltaY) return;
    const viewport = this.callbacks?.getViewport?.();
    if (!viewport || !this._contains(viewport, pointer)) return;
    pointer?.event?.preventDefault?.();
    this.callbacks?.changeZoom?.(
      deltaY > 0 ? -WORLD_MAP_CONFIG.view.zoomStep : WORLD_MAP_CONFIG.view.zoomStep,
      { x: pointer.x, y: pointer.y },
    );
  }

  _onKeyDown(event) {
    if (!this._isOpen()) return;
    const keys = WORLD_MAP_CONFIG.input.keys;
    if (event.code === keys.center) {
      event.preventDefault?.();
      this.callbacks?.centerOnPlayer?.();
      return;
    }
    if (keys.zoomIn.includes(event.code) || keys.zoomOut.includes(event.code)) {
      event.preventDefault?.();
      const direction = keys.zoomIn.includes(event.code) ? 1 : -1;
      this.callbacks?.changeZoom?.(direction * WORLD_MAP_CONFIG.view.zoomStep);
      return;
    }

    const panPx = WORLD_MAP_CONFIG.view.keyboardPanScreenPx;
    let deltaX = 0;
    let deltaY = 0;
    if (event.code === keys.panLeft) deltaX = panPx;
    else if (event.code === keys.panRight) deltaX = -panPx;
    else if (event.code === keys.panUp) deltaY = panPx;
    else if (event.code === keys.panDown) deltaY = -panPx;
    else return;
    event.preventDefault?.();
    this.callbacks?.panByPixels?.(deltaX, deltaY);
  }

  _contains(rect, pointer) {
    return Number.isFinite(pointer?.x) && Number.isFinite(pointer?.y)
      && pointer.x >= rect.x && pointer.y >= rect.y
      && pointer.x <= rect.x + rect.width
      && pointer.y <= rect.y + rect.height;
  }

  _matchesPointer(pointer) {
    return this.dragPointerId == null || pointer?.id == null || pointer.id === this.dragPointerId;
  }

  _setCursor(cursor) {
    if (this.zone?.input) this.zone.input.cursor = cursor;
  }

  cancelDrag() {
    this.dragPointerId = null;
    this.lastPointer = null;
    this._setCursor(WORLD_MAP_CONFIG.input.idleCursor);
  }

  destroy() {
    this.unbindViewport();
    this.scene?.input?.off?.("wheel", this._onWheel, this);
    this.scene?.input?.off?.("pointermove", this._onPointerMove, this);
    this.scene?.input?.off?.("pointerup", this._onPointerUp, this);
    this.scene?.input?.off?.("gameout", this._onGameOut, this);
    this.scene?.input?.keyboard?.off?.("keydown", this._onKeyDown, this);
    this.scene = null;
    this.callbacks = null;
  }
}

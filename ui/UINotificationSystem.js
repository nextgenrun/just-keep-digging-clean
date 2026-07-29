import { UI_COLORS } from "../values/uiColors.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";
import { NotificationCarouselState } from "./NotificationCarouselState.js";
import { UINotificationDragController } from "./UINotificationDragController.js";
import { UINotificationCarouselView } from "./UINotificationCarouselView.js";
import { UINotificationCarouselPresenter } from "./UINotificationCarouselPresenter.js";
const KIND_STYLES = Object.freeze({
  info: Object.freeze({ accent: UI_COLORS.borderHov, color: UI_COLORS.white }),
  success: Object.freeze({ accent: UI_COLORS.borderGood, color: UI_COLORS.white }),
  warning: Object.freeze({ accent: UI_COLORS.gold, color: UI_COLORS.white }),
  danger: Object.freeze({ accent: UI_COLORS.borderBad, color: UI_COLORS.white }),
});
const DOM_INPUT_CODES = Object.freeze({
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  X: "KeyX",
});

function inferKind(color) {
  const lower = typeof color === "string" ? color.toLowerCase() : "";
  if (lower.includes("44ff") || lower.includes("2ecc") || lower.includes("4ecb")) return "success";
  if (lower.includes("ff44") || lower.includes("ff66") || lower.includes("e070")) return "danger";
  if (lower.includes("ffaa") || lower.includes("ffdd") || lower.includes("ffd7")) return "warning";
  return UI_NOTIFICATION_CAROUSEL_CONFIG.defaultKind;
}

// Queues approved transient UI messages behind one centered seven-second card.
export class UINotificationSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.destroyed = false;
    this.keyed = new Map();
    this._dedupeHistory = new Map();
    this._entryCounter = 0;
    this._dedupeWindowMs = options.dedupeWindowMs
      ?? UI_NOTIFICATION_CAROUSEL_CONFIG.dedupeWindowMs;
    const maxQueued = options.maxQueued
      ?? options.maxToasts
      ?? UI_NOTIFICATION_CAROUSEL_CONFIG.maxQueued;
    this.state = new NotificationCarouselState(maxQueued);
    this.entries = this.state.entries;
    this._explicitBaseY = Number.isFinite(options.y) ? options.y : null;
    this.defaultBaseY = this._explicitBaseY ?? this._defaultBaseY();
    this.baseY = this.defaultBaseY;
    this.depth = options.depth
      ?? UI_NOTIFICATION_CAROUSEL_CONFIG.depth;
    this.view = new UINotificationCarouselView(scene, {
      onPrevious: () => this.cyclePrevious(),
      onNext: () => this.cycleNext(),
      onDismiss: () => this.closeAll(),
    });
    this.view.root.setDepth(this.depth).setPosition(this._centerX(), this.baseY);
    this.presenter = new UINotificationCarouselPresenter(scene, this.view, {
      getSnapshot: () => ({
        entry: this.state.current,
        position: this.state.position,
        total: this.state.size,
      }),
      getBaseY: () => this.baseY,
      getCenterX: () => this._centerX(),
      resolvePosition: (centerX, baseY) => (
        this.dragController?.resolvePosition(
          centerX,
          baseY,
          this.baseY - this.defaultBaseY,
        ) || { x: centerX, y: baseY }
      ),
      onExpire: entryId => this._expireCurrent(entryId),
    });
    this.dragController = new UINotificationDragController(scene, this.view, {
      onInteractionStart: () => this.presenter.interrupt(),
      onInteractionEnd: () => this.presenter.schedule(),
    });
    this.presenter.updatePosition();
    this._keys = this._registerKeys();
    this._domKeyTarget = globalThis.window || null;
    this._onDomKeyDown = event => this._handleDomKeyDown(event);
    this._domKeyTarget?.addEventListener?.("keydown", this._onDomKeyDown, true);
  }

  show(message, options = {}) {
    if (!message || this.destroyed || !this.scene?.time) return null;
    const now = Date.now();
    const normalized = this._normalizeOptions(options);
    const key = normalized.key || null;
    const dedupeKey = normalized.dedupeKey
      || `${normalized.kind}|${String(message).trim().toLowerCase()}`;

    this._cleanupDedupes(now);
    if (!key && !normalized.noDedupe) {
      const lastAt = this._dedupeHistory.get(dedupeKey) || 0;
      if (now - lastAt < this._dedupeWindowMs) return null;
      this._dedupeHistory.set(dedupeKey, now);
    }

    const existing = key ? this.keyed.get(key) : null;
    if (existing && this.entries.includes(existing)) {
      this._updateEntry(existing, message, normalized);
      return existing;
    }
    if (existing) this.keyed.delete(key);

    const current = this.state.current;
    const entry = {
      ...normalized,
      id: `notification-${++this._entryCounter}`,
      key,
      message: String(message),
      createdAt: now,
    };
    const shouldFocus = !current || entry.priority > current.priority;
    const result = this.state.enqueue(entry, { focus: shouldFocus });
    if (result.evicted) this._forgetEntry(result.evicted);
    if (!result.accepted) return null;
    if (key) this.keyed.set(key, entry);

    if (shouldFocus) {
      this.presenter.present({
        animate: Boolean(current) && !this.dragController.isInteracting,
      });
    } else {
      this.presenter.refresh();
    }
    return entry;
  }

  success(message, options = {}) {
    return this.show(message, { ...options, kind: "success" });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, kind: "warning" });
  }

  danger(message, options = {}) {
    return this.show(message, { ...options, kind: "danger" });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, kind: "info" });
  }

  cyclePrevious() {
    return this._cycle(-1);
  }

  cycleNext() {
    return this._cycle(1);
  }

  closeCurrent() {
    if (!this.state.current || this.destroyed) return false;
    return Boolean(this._removeCurrent());
  }

  closeAll() {
    if (this.destroyed || this.state.size === 0) return false;
    this.state.clear().forEach(entry => this._forgetEntry(entry));
    this.keyed.clear();
    this.presenter.clear();
    return true;
  }

  closeByKey(key) {
    if (!key || this.destroyed) return false;
    const entry = this.keyed.get(key);
    if (!entry) return false;
    if (this.state.current?.id === entry.id) return this.closeCurrent();

    const removed = this.state.removeById(entry.id);
    if (!removed) return false;
    this._forgetEntry(removed);
    this.presenter.refresh();
    return true;
  }

  handleInput() {
    if (!this._canHandleInput()) return false;

    const justDown = globalThis.Phaser?.Input?.Keyboard?.JustDown;
    if (typeof justDown !== "function") return false;
    // Dismiss wins if inputs land on the same frame: X clears every unread card.
    if (justDown(this._keys.dismiss)) {
      this.closeAll();
      return true;
    }
    if (this.state.size > 1 && justDown(this._keys.previous)) {
      this.cyclePrevious();
      return true;
    }
    if (this.state.size > 1 && justDown(this._keys.next)) {
      this.cycleNext();
      return true;
    }
    return false;
  }

  getSnapshot() {
    const current = this.state?.current || null;
    return {
      currentId: current?.id || null,
      currentKey: current?.key || null,
      message: current?.message || "",
      position: this.state?.position || 0,
      total: this.state?.size || 0,
      visible: Boolean(this.view?.root?.visible),
      suspended: Boolean(this.presenter?.suspended),
      transitioning: Boolean(this.presenter?.transitioning),
      transitionKind: this.presenter?.transitionKind || null,
    };
  }

  setPaused(paused) {
    if (this.destroyed) return;
    this.presenter.setPaused(paused);
  }

  setBaseY(value) {
    if (!Number.isFinite(value) || this.destroyed || value === this.baseY) return;
    this.baseY = value;
    this.presenter.updatePosition();
  }

  resize() {
    if (this.destroyed) return;
    const avoidanceOffsetY = this.baseY - this.defaultBaseY;
    this.defaultBaseY = this._explicitBaseY ?? this._defaultBaseY();
    this.baseY = this.defaultBaseY + avoidanceOffsetY;
    this.view.resize(this.baseY);
    this.presenter.refresh();
  }

  clear() {
    this.closeAll();
  }

  destroy() {
    if (this.destroyed) return;
    this.clear();
    this.destroyed = true;
    this._domKeyTarget?.removeEventListener?.(
      "keydown",
      this._onDomKeyDown,
      true,
    );
    Object.values(this._keys).forEach(key => key?.destroy?.());
    this.dragController?.destroy();
    this.dragController = null;
    this.presenter?.destroy();
    this._dedupeHistory.clear();
    this.keyed.clear();
    this.scene = null;
    this.view = null;
    this.presenter = null;
    this.state = null;
    this._domKeyTarget = null;
    this._onDomKeyDown = null;
  }

  _updateEntry(entry, message, options) {
    entry.message = String(message);
    entry.title = options.title;
    entry.kind = options.kind;
    entry.priority = options.priority;
    entry.color = options.color;
    entry.accentColor = options.accentColor;
    entry.fontSize = options.fontSize;
    if (this.state.current?.id === entry.id) {
      this.presenter.present({ animate: false });
    }
  }

  _cycle(step) {
    if (
      this.destroyed
      || this.presenter.suspended
      || this.state.size < 2
    ) {
      return false;
    }
    const removed = this.state.consumeCurrent(step);
    if (!removed) return false;
    this._forgetEntry(removed);
    return this.presenter.switch();
  }

  _removeCurrent() {
    this.presenter.interrupt();
    const removed = this.state.removeCurrent();
    if (!removed) return null;
    this._forgetEntry(removed);
    this.presenter.present({ animate: false });
    return removed;
  }

  _expireCurrent(entryId) {
    if (!entryId || this.state.current?.id !== entryId) return null;
    const removed = this.state.removeById(entryId);
    if (!removed) return null;
    this._forgetEntry(removed);
    return removed;
  }

  _normalizeOptions(options = {}) {
    const kind = options.kind || inferKind(options.color);
    const kindConfig = UI_NOTIFICATION_CAROUSEL_CONFIG.kinds[kind]
      || UI_NOTIFICATION_CAROUSEL_CONFIG.kinds.info;
    const style = KIND_STYLES[kind] || KIND_STYLES.info;
    return {
      ...options,
      kind,
      title: options.title || kindConfig.title,
      priority: Number.isFinite(options.priority)
        ? options.priority
        : kindConfig.priority,
      durationMs: UI_NOTIFICATION_CAROUSEL_CONFIG.visibleDurationMs,
      color: options.color || style.color,
      accentColor: options.accentColor || options.color || style.accent,
      noDedupe: options.noDedupe ?? false,
    };
  }

  _forgetEntry(entry) {
    if (!entry) return;
    if (entry.key && this.keyed.get(entry.key) === entry) {
      this.keyed.delete(entry.key);
    }
  }

  _cleanupDedupes(now) {
    const cutoff = now - this._dedupeWindowMs;
    for (const [key, at] of this._dedupeHistory.entries()) {
      if (!Number.isFinite(at) || at < cutoff) this._dedupeHistory.delete(key);
    }
  }

  _registerKeys() {
    const keyboard = this.scene?.input?.keyboard;
    const keyCodes = globalThis.Phaser?.Input?.Keyboard?.KeyCodes;
    const input = UI_NOTIFICATION_CAROUSEL_CONFIG.input;
    if (!keyboard?.addKey || !keyCodes) {
      return { previous: null, next: null, dismiss: null };
    }
    const keys = {
      previous: keyboard.addKey(keyCodes[input.previous]),
      next: keyboard.addKey(keyCodes[input.next]),
      dismiss: keyboard.addKey(keyCodes[input.dismiss]),
    };
    keyboard.addCapture?.(
      Object.values(keys).filter(Boolean).map(key => key.keyCode),
    );
    return keys;
  }

  _handleDomKeyDown(event) {
    if (event?.repeat || !this._canHandleInput()) return false;
    const input = UI_NOTIFICATION_CAROUSEL_CONFIG.input;
    const code = event?.code || "";
    const key = String(event?.key || "").toLowerCase();
    let handled = false;

    if (code === DOM_INPUT_CODES[input.dismiss] || key === input.dismiss.toLowerCase()) {
      handled = this.closeAll();
    } else if (
      this.state.size > 1
      && (code === DOM_INPUT_CODES[input.previous] || key === "arrowleft")
    ) {
      handled = this.cyclePrevious();
    } else if (
      this.state.size > 1
      && (code === DOM_INPUT_CODES[input.next] || key === "arrowright")
    ) {
      handled = this.cycleNext();
    }

    if (handled) {
      event?.preventDefault?.();
      event?.stopImmediatePropagation?.();
    }
    return handled;
  }

  _canHandleInput() {
    const sceneActive = typeof this.scene?.sys?.isActive !== "function"
      || this.scene.sys.isActive();
    return Boolean(
      !this.destroyed
      && !this.presenter?.suspended
      && this.state?.current
      && !this.scene?._settingsKeyCaptureActive
      && sceneActive
    );
  }

  _centerX() {
    const width = this.scene?.scale?.width
      || this.scene?.config?.viewportWidth
      || APPROVED_HUD_SKIN.referenceViewport.width;
    return width / 2;
  }

  _defaultBaseY() {
    const reference = APPROVED_HUD_SKIN.referenceViewport;
    const scale = Math.min(
      (this.scene?.scale?.width || reference.width) / reference.width,
      (this.scene?.scale?.height || reference.height) / reference.height,
    );
    return APPROVED_HUD_SKIN.layout.notification.y * scale;
  }
}

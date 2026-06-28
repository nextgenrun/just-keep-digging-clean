import { UI_COLORS } from "../values/uiColors.js";

const KIND_STYLES = Object.freeze({
  info: { accent: 0x7ab8f5, color: UI_COLORS.white },
  success: { accent: 0x4ecb71, color: UI_COLORS.white },
  warning: { accent: 0xffaa33, color: UI_COLORS.white },
  danger: { accent: 0xe07030, color: UI_COLORS.white },
});

function colorStringToNumber(value) {
  if (typeof value !== "string" || !value.startsWith("#")) return null;
  const parsed = Number.parseInt(value.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferKind(color) {
  const lower = typeof color === "string" ? color.toLowerCase() : "";
  if (lower.includes("44ff") || lower.includes("2ecc") || lower.includes("4ecb")) return "success";
  if (lower.includes("ff44") || lower.includes("ff66") || lower.includes("e070")) return "danger";
  if (lower.includes("ffaa") || lower.includes("ffdd") || lower.includes("ffd7")) return "warning";
  return "info";
}

export class UINotificationSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.maxToasts = options.maxToasts ?? 4;
    this.depth = options.depth ?? 3600;
    this.baseY = options.y ?? 58;
    this.gap = options.gap ?? 10;
    this.entries = [];
    this.keyed = new Map();
    this._allEntries = new Set();
    this.destroyed = false;
  }

  show(message, options = {}) {
    if (!message || this.destroyed || !this.scene?.add || !this.scene?.time) return null;

    const key = options.key || null;
    const existing = key ? this.keyed.get(key) : null;
    if (existing && !existing.expiring && existing.root?.active) {
      this._updateEntry(existing, message, options);
      return existing;
    } else if (existing) {
      this.keyed.delete(key);
    }

    const entry = this._createEntry(message, options);
    this.entries.unshift(entry);
    if (key) this.keyed.set(key, entry);

    while (this.entries.length > this.maxToasts) {
      this._expire(this.entries[this.entries.length - 1], true);
    }

    this._layout();
    this.scene.tweens.add({
      targets: entry.root,
      alpha: 1,
      y: entry.targetY,
      duration: 150,
      ease: "Power2.out",
    });
    this._schedule(entry, options.durationMs);
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

  clear() {
    [...this.entries].forEach(entry => this._expire(entry, true));
  }

  destroy() {
    this.destroyed = true;
    [...this._allEntries].forEach(entry => this._destroyEntry(entry));
    this.entries = [];
    this.keyed.clear();
    this._allEntries.clear();
    this.scene = null;
  }

  _createEntry(message, options) {
    const width = Math.min(520, Math.max(280, (this.scene.scale?.width || 1280) - 48));
    const root = this.scene.add.container(this._centerX(), this.baseY - 18)
      .setDepth(this.depth)
      .setScrollFactor(0)
      .setAlpha(0);

    const bg = this.scene.add.graphics();
    const text = this.scene.add.text(-width / 2 + 18, 0, "", {
      fontFamily: "Consolas, monospace",
      fontSize: options.fontSize || "14px",
      fontStyle: "bold",
      color: UI_COLORS.white,
      lineSpacing: 2,
      wordWrap: { width: width - 36, useAdvancedWrap: true },
    }).setOrigin(0, 0.5);

    root.add([bg, text]);

    const entry = {
      key: options.key || null,
      root,
      bg,
      text,
      width,
      height: 42,
      timer: null,
      targetY: this.baseY,
      expiring: false,
    };
    this._updateEntry(entry, message, options, false);
    this._allEntries.add(entry);
    return entry;
  }

  _updateEntry(entry, message, options = {}, reschedule = true) {
    if (this.destroyed || !entry?.root?.active) return;

    const kind = options.kind || inferKind(options.color);
    const style = KIND_STYLES[kind] || KIND_STYLES.info;
    const colorNumber = colorStringToNumber(options.color) ?? style.accent;

    entry.text.setText(String(message));
    entry.text.setColor(options.color || style.color);
    entry.height = Math.max(42, entry.text.height + 22);

    entry.bg.clear();
    entry.bg.fillStyle(UI_COLORS.bg, 0.94);
    entry.bg.fillRoundedRect(-entry.width / 2, -entry.height / 2, entry.width, entry.height, 6);
    entry.bg.lineStyle(1, UI_COLORS.borderDim, 0.95);
    entry.bg.strokeRoundedRect(-entry.width / 2, -entry.height / 2, entry.width, entry.height, 6);
    entry.bg.fillStyle(colorNumber, 0.95);
    entry.bg.fillRoundedRect(-entry.width / 2, -entry.height / 2, 5, entry.height, 6);

    entry.root.setAlpha(1);
    entry.expiring = false;
    this._layout();
    if (reschedule) this._schedule(entry, options.durationMs);
  }

  _schedule(entry, durationMs = 2200) {
    if (this.destroyed || !this.scene?.time || !entry?.root?.active) return;
    entry.timer?.remove?.();
    const duration = Math.max(150, Number.isFinite(durationMs) ? durationMs : 2200);
    entry.timer = this.scene.time.delayedCall(duration, () => this._expire(entry));
  }

  _expire(entry, immediate = false) {
    if (!entry || entry.expiring) return;
    entry.expiring = true;
    entry.timer?.remove?.();
    entry.timer = null;
    this.entries = this.entries.filter(item => item !== entry);
    if (entry.key) this.keyed.delete(entry.key);
    this.scene?.tweens?.killTweensOf?.(entry.root);

    const destroy = () => this._destroyEntry(entry);

    if (immediate || this.destroyed || !this.scene?.tweens) {
      destroy();
      return;
    }

    this.scene.tweens.add({
      targets: entry.root,
      alpha: 0,
      y: entry.root.y - 12,
      duration: 180,
      ease: "Power1.in",
      onComplete: destroy,
    });
  }

  _destroyEntry(entry) {
    if (!entry) return;
    entry.timer?.remove?.();
    entry.timer = null;
    this.scene?.tweens?.killTweensOf?.(entry.root);
    if (entry.root?.active) entry.root.destroy(true);
    this.entries = this.entries.filter(item => item !== entry);
    if (entry.key) this.keyed.delete(entry.key);
    this._allEntries.delete(entry);
    this._layout();
  }

  _layout() {
    if (this.destroyed || !this.scene?.tweens) return;
    let y = this.baseY;
    this.entries = this.entries.filter(entry => entry?.root?.active);
    this.entries.forEach(entry => {
      entry.targetY = y;
      this.scene.tweens.killTweensOf(entry.root);
      this.scene.tweens.add({
        targets: entry.root,
        x: this._centerX(),
        y,
        duration: 140,
        ease: "Power2.out",
      });
      y += entry.height + this.gap;
    });
  }

  _centerX() {
    return (this.scene?.scale?.width || this.scene?.config?.viewportWidth || 1280) / 2;
  }
}

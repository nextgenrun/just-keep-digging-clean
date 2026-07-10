import { UI_COLORS } from "../values/uiColors.js";

const KIND_STYLES = Object.freeze({
  info: { accent: 0x7ab8f5, color: UI_COLORS.white },
  success: { accent: 0x4ecb71, color: UI_COLORS.white },
  warning: { accent: 0xffaa33, color: UI_COLORS.white },
  danger: { accent: 0xe07030, color: UI_COLORS.white },
});

const KIND_PRIORITY = Object.freeze({
  info: 0,
  success: 1,
  warning: 2,
  danger: 3,
});

const KIND_DEFAULT_DURATIONS = Object.freeze({
  info: 2000,
  success: 2400,
  warning: 3600,
  danger: 5200,
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
    this._dedupeHistory = new Map();
    this._dedupeWindowMs = options.dedupeWindowMs ?? 1800;
    this._entryCounter = 0;
  }

  show(message, options = {}) {
    if (!message || this.destroyed || !this.scene?.add || !this.scene?.time) return null;
    const now = Date.now();
    const normalized = this._normalizeOptions(options);
    const key = normalized.key || null;
    const dedupeKey = normalized.dedupeKey || `${normalized.kind}|${String(message).trim().toLowerCase()}`;

    this._cleanupDedupes(now);
    if (!key && !normalized.noDedupe) {
      const lastAt = this._dedupeHistory.get(dedupeKey) || 0;
      if (now - lastAt < this._dedupeWindowMs) return null;
      this._dedupeHistory.set(dedupeKey, now);
    }

    const existing = key ? this.keyed.get(key) : null;
    if (existing && !existing.expiring && existing.root?.active) {
      this._updateEntry(existing, message, normalized);
      return existing;
    } else if (existing) {
      this.keyed.delete(key);
    }

    const entry = this._createEntry(message, normalized);
    this.entries.push(entry);
    this._entryCounter += 1;
    entry.createdAt = now;
    this._sortEntries();
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
    this._schedule(entry, normalized.durationMs);
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
    const normalized = this._normalizeOptions(options);
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
      root,
      bg,
      text,
      width,
      height: 42,
      timer: null,
      targetY: this.baseY,
      expiring: false,
      key: normalized.key || null,
      priority: Number.isFinite(normalized.priority) ? normalized.priority : KIND_PRIORITY.info,
      durationMs: Number.isFinite(normalized.durationMs) ? normalized.durationMs : KIND_DEFAULT_DURATIONS.info,
      kind: normalized.kind,
    };
    this._updateEntry(entry, message, normalized, false);
    this._allEntries.add(entry);
    return entry;
  }

  _updateEntry(entry, message, options = {}, reschedule = true) {
    if (this.destroyed || !entry?.root?.active) return;

    const kind = options.kind || inferKind(options.color);
    const style = KIND_STYLES[kind] || KIND_STYLES.info;
    const color = options.color || style.color;
    const durationMs = options.durationMs;
    const colorNumber = colorStringToNumber(color) ?? style.accent;

    entry.text.setText(String(message));
    entry.text.setColor(color);
    entry.height = Math.max(42, entry.text.height + 22);
    entry.kind = kind;
    entry.priority = Number.isFinite(options.priority) ? options.priority : KIND_PRIORITY[kind];
    entry.durationMs = Number.isFinite(durationMs) ? durationMs : KIND_DEFAULT_DURATIONS[kind];

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

  _normalizeOptions(options = {}) {
    const kind = options.kind || inferKind(options.color);
    const style = KIND_STYLES[kind] || KIND_STYLES.info;
    const durationMs = Number.isFinite(options.durationMs)
      ? options.durationMs
      : KIND_DEFAULT_DURATIONS[kind];
    const priority = Number.isFinite(options.priority)
      ? options.priority
      : KIND_PRIORITY[kind];

    return {
      ...options,
      kind,
      priority,
      durationMs: Number.isFinite(durationMs) ? durationMs : 2200,
      color: options.color || style.color,
      noDedupe: options.noDedupe ?? false,
    };
  }

  _sortEntries() {
    this.entries = this.entries.sort((a, b) => {
      const aPriority = Number.isFinite(a?.priority) ? a.priority : 0;
      const bPriority = Number.isFinite(b?.priority) ? b.priority : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    this._layout();
  }

  _cleanupDedupes(now) {
    if (!this._dedupeHistory?.size) return;
    const cutoff = now - this._dedupeWindowMs;
    for (const [dedupeKey, at] of this._dedupeHistory.entries()) {
      if (!Number.isFinite(at) || at < cutoff) this._dedupeHistory.delete(dedupeKey);
    }
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

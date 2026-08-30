import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

function cssColor(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, "0")}`;
}

/** Pools authored map symbols and discovery-safe labels above the map graphics. */
export class WorldMapAnnotationView {
  constructor(scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setScrollFactor(0);
    this.entries = new Map();
  }

  setMask(mask) {
    this.root.setMask(mask);
  }

  _addText(style) {
    const text = this.scene.add.text(0, 0, "", style)
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
    text.setResolution?.(WORLD_MAP_CONFIG.annotations.textResolution);
    this.root.add(text);
    return text;
  }

  _createMarkerEntry(key) {
    const config = WORLD_MAP_CONFIG;
    const image = this.scene.add.image(0, 0, ASSET_KEYS.ui.worldMapSymbols, 0)
      .setOrigin(0.5)
      .setScrollFactor(0);
    const text = this._addText({
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: `${config.annotations.markerLabelFontSizePx}px`,
      fontStyle: "bold",
      color: config.colors.body,
      align: "center",
      lineSpacing: config.annotations.markerLabelLineSpacingPx,
      stroke: config.colors.annotationStroke,
      strokeThickness: config.annotations.markerLabelStrokeThicknessPx,
      wordWrap: { width: config.annotations.markerLabelMaximumWidthPx },
    });
    this.root.addAt(image, 0);
    const entry = { key, type: "marker", image, text, seen: true };
    this.entries.set(key, entry);
    return entry;
  }

  _createBiomeEntry(key) {
    const config = WORLD_MAP_CONFIG;
    const text = this._addText({
      fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
      fontSize: `${config.annotations.biomeLabelFontSizePx}px`,
      fontStyle: "bold",
      color: config.colors.biomeLabel,
      align: "center",
      stroke: config.colors.annotationStroke,
      strokeThickness: config.annotations.biomeLabelStrokeThicknessPx,
    }).setOrigin(0.5);
    const entry = { key, type: "biome", text, seen: true };
    this.entries.set(key, entry);
    return entry;
  }

  _syncMarker(marker) {
    const config = WORLD_MAP_CONFIG;
    const entry = this.entries.get(marker.key) || this._createMarkerEntry(marker.key);
    entry.seen = true;
    entry.image
      .setFrame(marker.iconFrame)
      .setPosition(marker.x, marker.y)
      .setDisplaySize(marker.iconSizePx, marker.iconSizePx)
      .setAlpha(marker.alpha ?? 1)
      .setVisible(true);
    if (Number.isFinite(marker.iconTint)) entry.image.setTint(marker.iconTint);
    else entry.image.clearTint?.();
    if (marker.showLabel) {
      const detail = marker.detail ? `\n${marker.detail}` : "";
      entry.text
        .setText(`${marker.label}${detail}`)
        .setColor(cssColor(marker.color, config.colors.body))
        .setPosition(marker.x, marker.y + config.annotations.markerLabelOffsetYPx)
        .setVisible(true);
    } else {
      entry.text.setVisible(false);
    }
    return entry;
  }

  _syncBiome(label) {
    const entry = this.entries.get(label.key) || this._createBiomeEntry(label.key);
    entry.seen = true;
    entry.text
      .setText(label.label)
      .setPosition(label.x, label.y)
      .setAlpha(WORLD_MAP_CONFIG.annotations.biomeLabelAlpha)
      .setVisible(true);
    return entry;
  }

  render({ markers = [], biomeLabels = [], player = null } = {}) {
    for (const entry of this.entries.values()) entry.seen = false;
    biomeLabels.forEach(label => this._syncBiome(label));
    markers.forEach(marker => this._syncMarker(marker));
    if (player) {
      const collisionSquared = WORLD_MAP_CONFIG.annotations.playerLabelCollisionPx ** 2;
      const labelBlocked = markers.some(marker => (
        marker.showLabel
        && ((marker.x - player.x) ** 2 + (marker.y - player.y) ** 2) < collisionSquared
      ));
      const entry = this._syncMarker({
        ...player,
        showLabel: player.showLabel && !labelBlocked,
      });
      this.root.bringToTop(entry.image);
      this.root.bringToTop(entry.text);
    }
    for (const [key, entry] of this.entries) {
      if (entry.seen) continue;
      entry.image?.destroy?.();
      entry.text?.destroy?.();
      this.entries.delete(key);
    }
  }

  destroy() {
    this.entries.clear();
    this.root?.destroy?.(true);
    this.root = null;
    this.scene = null;
  }
}

// Compact live GP and mining-damage readout anchored to the authored actionbar.

import { CELESTIAL_ACTION_BAR_CONFIG } from "../../values/celestialActionBar.js";
import { UI_FONTS } from "../../values/uiLayout.js";

function finite(value) {
  return Math.max(0, Number(value) || 0);
}

export class CelestialActionBarMetricsView {
  constructor(scene, getMetrics = null) {
    this.scene = scene;
    this.getMetrics = getMetrics;
    this.ready = true;
    this.visible = true;
    this.lastSnapshot = Object.freeze({ gpCurrent: 0, gpMax: 0, miningDamage: 0 });
    this.gpText = this._createText(CELESTIAL_ACTION_BAR_CONFIG.presentation.gpMetricColor);
    this.damageText = this._createText(
      CELESTIAL_ACTION_BAR_CONFIG.presentation.damageMetricColor,
    );
    this.sync();
  }

  _createText(color) {
    const presentation = CELESTIAL_ACTION_BAR_CONFIG.presentation;
    return this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.display,
      fontSize: `${presentation.metricFontSizePx}px`,
      fontStyle: "bold",
      color,
      stroke: presentation.shadowColor,
      strokeThickness: presentation.metricShadowThicknessPx,
      align: "center",
    }).setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(presentation.depth);
  }

  sync() {
    let source = null;
    try {
      source = this.getMetrics?.() || null;
    } catch {
      source = null;
    }
    const snapshot = Object.freeze({
      gpCurrent: finite(source?.gpCurrent),
      gpMax: finite(source?.gpMax),
      miningDamage: finite(source?.miningDamage),
    });
    this.lastSnapshot = snapshot;
    this.gpText.setText(`GP ${Math.floor(snapshot.gpCurrent)}/${Math.floor(snapshot.gpMax)}`);
    this.damageText.setText(`MINE DMG ${Math.round(snapshot.miningDamage)}`);
    return snapshot;
  }

  resize(centerX, centerY, scale) {
    const layout = CELESTIAL_ACTION_BAR_CONFIG.layout;
    this.gpText.setPosition(
      centerX - layout.metricOffsetXPx * scale,
      centerY + layout.metricOffsetYPx * scale,
    ).setScale(scale);
    this.damageText.setPosition(
      centerX + layout.metricOffsetXPx * scale,
      centerY + layout.metricOffsetYPx * scale,
    ).setScale(scale);
  }

  setVisible(visible) {
    this.visible = visible === true;
    this.gpText.setVisible(this.visible);
    this.damageText.setVisible(this.visible);
  }

  getSnapshot() {
    return Object.freeze({
      ready: this.ready,
      visible: this.visible,
      ...this.lastSnapshot,
    });
  }

  destroy() {
    this.ready = false;
    this.gpText?.destroy();
    this.damageText?.destroy();
    this.getMetrics = null;
    this.scene = null;
  }
}

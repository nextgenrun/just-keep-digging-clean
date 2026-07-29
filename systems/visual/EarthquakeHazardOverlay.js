import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { EarthquakeFallZoneView } from "./EarthquakeFallZoneView.js";

const tileKey = (tx, ty) => `${tx},${ty}`;

export class EarthquakeHazardOverlay {
  constructor(scene, earthquakeSystem, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.source = earthquakeSystem;
    this.config = config;
    this.recentRubble = new Map();
    this.recentOpenings = new Map();
    this.destroyed = false;
    this.fallZoneView = new EarthquakeFallZoneView(
      scene,
      earthquakeSystem,
      config,
    );
    this._createEdgeIndicator();
  }

  get warningPool() {
    return this.fallZoneView.warningPool;
  }

  get rockPool() {
    return this.fallZoneView.rockPool;
  }

  _createEdgeIndicator() {
    const cfg = this.config.hazards;
    this.edgeRoot = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.config.hudDepth)
      .setVisible(false);
    this.edgeIcon = this.scene.add.image(
      cfg.edgeIconX,
      0,
      this.config.assets.medallion.key,
    ).setDisplaySize(cfg.edgeIconSize, cfg.edgeIconSize);
    this.edgeText = this.scene.add.text(cfg.edgeTextX, 0, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: cfg.edgeFontSize,
      fontStyle: "bold",
      color: UI_COLORS.white,
      stroke: cfg.edgeTextStroke,
      strokeThickness: cfg.edgeTextStrokeWidth,
    }).setOrigin(0, 0.5);
    this.edgeRoot.add([this.edgeIcon, this.edgeText]);
  }

  update() {
    if (this.destroyed || !this.config.enabled) return;
    this.fallZoneView.update();
    this._pruneRecent();
    this._updateEdgeIndicator();
  }

  playRockImpact(rock) {
    return this.fallZoneView.playRockImpact(rock);
  }

  markRestoredRubble(tx, ty) {
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return;
    this.recentRubble.set(tileKey(tx, ty), {
      expiresAt: (this.scene.time?.now || 0)
        + this.config.hazards.restoredOutlineMs,
    });
  }

  markOpenedPassage(tx, ty) {
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return;
    this.recentOpenings.set(tileKey(tx, ty), {
      expiresAt: (this.scene.time?.now || 0)
        + this.config.hazards.openedPassageHighlightMs,
    });
  }

  _updateEdgeIndicator() {
    const camera = this.scene.cameras?.main;
    const awarenessKnown = typeof this.source?.isPlayerAware === "function";
    if (!camera?.worldView || (awarenessKnown && !this.source.isPlayerAware())) {
      this.edgeRoot.setVisible(false);
      return;
    }
    const candidate = this._offscreenHazards(camera.worldView)[0];
    if (!candidate) {
      this.edgeRoot.setVisible(false);
      return;
    }

    const cfg = this.config.hazards;
    const vw = this.scene.scale?.width || this.scene.config.viewportWidth;
    const vh = this.scene.scale?.height || this.scene.config.viewportHeight;
    const view = camera.worldView;
    const rawX = ((candidate.x - view.x) / view.width) * vw;
    const rawY = ((candidate.y - view.y) / view.height) * vh;
    const halfW = cfg.edgeWidth / 2;
    const halfH = cfg.edgeHeight / 2;
    const x = Math.max(
      cfg.edgeInset + halfW,
      Math.min(vw - cfg.edgeInset - halfW, rawX),
    );
    const y = Math.max(
      cfg.edgeInset + halfH,
      Math.min(vh - cfg.edgeInset - halfH, rawY),
    );
    const glyph = rawX < 0 ? "◀" : rawX > vw ? "▶" : rawY < 0 ? "▲" : "▼";
    this.edgeRoot.setPosition(x, y).setVisible(true);
    this.edgeText.setText(`${glyph} ${this.config.labels.danger}`);
  }

  _offscreenHazards(view) {
    const ts = this.scene.config.tileSize;
    const margin = this.config.hazards.viewportMargin;
    const right = view.right ?? view.x + view.width;
    const bottom = view.bottom ?? view.y + view.height;
    const hazards = (this.source?.caveIns || []).map(zone => ({
      x: (zone.tx + 0.5) * ts,
      y: zone.landingTy * ts,
    })).concat((this.source?.fallingRocks || []).map(rock => ({
      x: rock.x,
      y: rock.endY,
    })));
    return hazards.filter(point => point.x < view.x + margin
      || point.x > right - margin
      || point.y < view.y + margin
      || point.y > bottom - margin);
  }

  _pruneRecent() {
    const now = this.scene.time?.now || 0;
    for (const [key, value] of this.recentRubble) {
      if (now >= value.expiresAt) this.recentRubble.delete(key);
    }
    for (const [key, value] of this.recentOpenings) {
      if (now >= value.expiresAt) this.recentOpenings.delete(key);
    }
  }

  clear() {
    this.fallZoneView.clear();
    this.recentRubble.clear();
    this.recentOpenings.clear();
    this.edgeRoot?.setVisible(false);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clear();
    this.fallZoneView.destroy();
    this.edgeRoot?.destroy(true);
    this.scene = null;
    this.source = null;
  }
}

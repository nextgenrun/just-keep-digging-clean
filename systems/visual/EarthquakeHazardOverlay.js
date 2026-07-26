import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const tileKey = (tx, ty) => `${tx},${ty}`;

export class EarthquakeHazardOverlay {
  constructor(scene, earthquakeSystem, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.source = earthquakeSystem;
    this.config = config;
    this.recentRubble = new Map();
    this.recentOpenings = new Map();
    this.destroyed = false;
    this._create();
  }

  _create() {
    this.worldGraphics = this.scene.add.graphics().setDepth(this.config.worldDepth);
    this.markerPool = Array.from(
      { length: this.config.hazards.maxMarkers },
      () => this._createMarker()
    );
    this.edgeRoot = this.scene.add.container(0, 0)
      .setScrollFactor(0).setDepth(this.config.hudDepth).setVisible(false);
    this.edgeBg = this.scene.add.graphics();
    this.edgeText = this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: this.config.hazards.edgeFontSize,
      fontStyle: "bold",
      color: UI_COLORS.white,
    }).setOrigin(0.5);
    this.edgeRoot.add([this.edgeBg, this.edgeText]);
  }

  _createMarker() {
    const root = this.scene.add.container(0, 0).setDepth(this.config.worldDepth).setVisible(false);
    const graphics = this.scene.add.graphics();
    const text = this.scene.add.text(0, 0, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: this.config.hazards.markerFontSize,
      fontStyle: "bold",
      color: UI_COLORS.white,
      stroke: "#0b1015",
      strokeThickness: this.config.hazards.markerStrokeWidth,
    }).setOrigin(0.5, 0);
    root.add([graphics, text]);
    return { root, graphics, text };
  }

  markRestoredRubble(tx, ty) {
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return;
    const expiresAt = (this.scene.time?.now || 0) + this.config.hazards.restoredOutlineMs;
    this.recentRubble.set(tileKey(tx, ty), { tx, ty, expiresAt });
  }

  markOpenedPassage(tx, ty) {
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) return;
    const expiresAt = (this.scene.time?.now || 0)
      + this.config.hazards.openedPassageHighlightMs;
    this.recentOpenings.set(tileKey(tx, ty), { tx, ty, expiresAt });
  }

  update() {
    if (this.destroyed || !this.config.enabled) return;
    this.worldGraphics.clear();
    this._drawRockLanes();
    this._drawRecentRubble();
    this._drawRecentOpenings();
    this._updateMarkers();
    this._updateEdgeIndicator();
  }

  _drawRockLanes() {
    const cfg = this.config.hazards;
    const ts = this.scene.config.tileSize;
    const laneWidth = ts * cfg.rockLaneWidthTiles;
    const rocks = (this.source?.fallingRocks || []).slice(0, cfg.maxRockLanes);
    for (const rock of rocks) {
      const height = Math.max(ts, rock.endY - rock.y);
      const left = rock.x - laneWidth / 2;
      this.worldGraphics.fillStyle(this.config.colors.danger, cfg.rockLaneAlpha);
      this.worldGraphics.fillRect(left, rock.y, laneWidth, height);
      this.worldGraphics.lineStyle(2, this.config.colors.danger, cfg.rockLaneBorderAlpha);
      this.worldGraphics.strokeRect(left, rock.y, laneWidth, height);
    }
  }

  _drawRecentRubble() {
    const now = this.scene.time?.now || 0;
    const ts = this.scene.config.tileSize;
    const cfg = this.config.hazards;
    this.worldGraphics.lineStyle(cfg.restoredOutlineWidth, this.config.colors.warning, 0.9);
    for (const [key, rubble] of this.recentRubble) {
      if (now >= rubble.expiresAt) {
        this.recentRubble.delete(key);
        continue;
      }
      const alpha = clamp((rubble.expiresAt - now) / cfg.restoredOutlineMs, 0.2, 1);
      this.worldGraphics.lineStyle(cfg.restoredOutlineWidth, this.config.colors.warning, alpha);
      this.worldGraphics.strokeRect(rubble.tx * ts, rubble.ty * ts, ts, ts);
    }
  }

  _drawRecentOpenings() {
    const now = this.scene.time?.now || 0;
    const ts = this.scene.config.tileSize;
    const cfg = this.config.hazards;
    for (const [key, opening] of this.recentOpenings) {
      if (now >= opening.expiresAt) {
        this.recentOpenings.delete(key);
        continue;
      }
      const alpha = clamp(
        (opening.expiresAt - now) / cfg.openedPassageHighlightMs,
        0.18,
        0.9
      );
      this.worldGraphics.lineStyle(
        cfg.openedPassageOutlineWidth,
        this.config.colors.cyan,
        alpha
      );
      this.worldGraphics.strokeRoundedRect(
        opening.tx * ts + 4,
        opening.ty * ts + 4,
        ts - 8,
        ts - 8,
        8
      );
    }
  }

  _updateMarkers() {
    const player = this.scene.playerController?.getPlayerTile?.();
    const caveIns = [...(this.source?.caveIns || [])]
      .filter(caveIn => this._isCaveInVisible(caveIn))
      .sort((a, b) => this._tileDistance(a, player) - this._tileDistance(b, player));
    this.markerPool.forEach((marker, index) => {
      const caveIn = caveIns[index];
      if (!caveIn) {
        marker.root.setVisible(false);
        return;
      }
      this._renderMarker(marker, caveIn);
    });
  }

  _renderMarker(marker, caveIn) {
    const cfg = this.config.hazards;
    const ts = this.scene.config.tileSize;
    const radius = cfg.markerRadius;
    const remainingRatio = clamp(caveIn.remaining / this.source.config.caveInWarningMs, 0, 1);
    const label = caveIn.chain ? this.config.labels.aftershock : this.config.labels.caveIn;
    marker.root.setPosition(
      caveIn.tx * ts + ts / 2,
      caveIn.ty * ts + ts / 2 + cfg.markerOffsetY
    ).setVisible(true);
    marker.text.setText(`${label} ${Math.max(0, caveIn.remaining / 1000).toFixed(1)}s`)
      .setPosition(0, radius + cfg.markerStrokeWidth);
    marker.graphics.clear();
    marker.graphics.fillStyle(0x0b1015, 0.82);
    marker.graphics.fillCircle(0, 0, radius);
    marker.graphics.lineStyle(cfg.markerStrokeWidth, this.config.colors.danger, 0.35);
    marker.graphics.strokeCircle(0, 0, radius);
    marker.graphics.lineStyle(cfg.markerStrokeWidth, this.config.colors.danger, 1);
    marker.graphics.beginPath();
    marker.graphics.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remainingRatio);
    marker.graphics.strokePath();
    marker.graphics.fillStyle(this.config.colors.danger, 1);
    marker.graphics.fillTriangle(0, -radius * 0.46, radius * 0.42, radius * 0.34, -radius * 0.42, radius * 0.34);
    marker.graphics.fillStyle(0x0b1015, 1);
    marker.graphics.fillRect(-2, -radius * 0.2, 4, radius * 0.24);
    marker.graphics.fillCircle(0, radius * 0.21, 2);
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
    const halfW = cfg.edgePillWidth / 2;
    const halfH = cfg.edgePillHeight / 2;
    const x = clamp(rawX, cfg.edgeInset + halfW, vw - cfg.edgeInset - halfW);
    const y = clamp(rawY, cfg.edgeInset + halfH, vh - cfg.edgeInset - halfH);
    const glyph = rawX < 0 ? "◀" : rawX > vw ? "▶" : rawY < 0 ? "▲" : "▼";
    this.edgeRoot.setPosition(x, y).setVisible(true);
    this.edgeText.setText(`${glyph} ${this.config.labels.danger}`);
    this.edgeBg.clear();
    this.edgeBg.fillStyle(0x0b1015, this.config.colors.panelAlpha);
    this.edgeBg.fillRoundedRect(-halfW, -halfH, cfg.edgePillWidth, cfg.edgePillHeight, halfH);
    this.edgeBg.lineStyle(2, this.config.colors.danger, 1);
    this.edgeBg.strokeRoundedRect(-halfW, -halfH, cfg.edgePillWidth, cfg.edgePillHeight, halfH);
  }

  _offscreenHazards(view) {
    const ts = this.scene.config.tileSize;
    const margin = this.config.hazards.viewportMargin;
    const hazards = (this.source?.caveIns || []).map(caveIn => ({
      x: caveIn.tx * ts + ts / 2,
      y: caveIn.ty * ts + ts / 2,
    })).concat((this.source?.fallingRocks || []).map(rock => ({ x: rock.x, y: rock.endY })));
    return hazards.filter(point => point.x < view.x + margin
      || point.x > view.right - margin
      || point.y < view.y + margin
      || point.y > view.bottom - margin);
  }

  _tileDistance(tile, player) {
    if (!player) return 0;
    return Math.abs(tile.tx - player.tx) + Math.abs(tile.ty - player.ty);
  }

  _isCaveInVisible(caveIn) {
    const view = this.scene.cameras?.main?.worldView;
    if (!view) return true;
    const ts = this.scene.config.tileSize;
    const x = caveIn.tx * ts + ts / 2;
    const y = caveIn.ty * ts + ts / 2 + this.config.hazards.markerOffsetY;
    return x >= view.x && x <= view.right && y >= view.y && y <= view.bottom;
  }

  clear() {
    this.recentRubble.clear();
    this.recentOpenings.clear();
    this.worldGraphics?.clear();
    this.markerPool?.forEach(marker => marker.root.setVisible(false));
    this.edgeRoot?.setVisible(false);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clear();
    this.worldGraphics?.destroy();
    this.markerPool?.forEach(marker => marker.root.destroy(true));
    this.edgeRoot?.destroy(true);
    this.scene = null;
    this.source = null;
  }
}

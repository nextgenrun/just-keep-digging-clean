import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  getThunderStrikeStage,
} from "../../values/thunderStrikeChain.js";

export class ThunderStrikeImpactFxSystem {
  constructor(scene, config = THUNDER_STRIKE_CHAIN_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.activeObjects = new Set();
  }

  play(strikeResult, player, stageIndex = 0) {
    const scene = this.scene;
    if (!scene?.add?.graphics || !player) return;
    const stage = getThunderStrikeStage(stageIndex);
    const fx = this.config.impactFx;
    const tileSize = scene.config?.tileSize || 32;
    const hits = Array.isArray(strikeResult?.results) ? strikeResult.results : [];
    const firstHit = hits[0];
    const lastHit = hits[hits.length - 1] || firstHit;
    const impactX = firstHit
      ? firstHit.tx * tileSize + tileSize / 2
      : player.x;
    const impactY = firstHit
      ? firstHit.ty * tileSize + tileSize / 2
      : player.y + tileSize;
    const endY = lastHit
      ? lastHit.ty * tileSize + tileSize / 2
      : impactY + tileSize * 2;
    const startY = Math.min(player.y, impactY) - tileSize * fx.boltSkyHeightTiles;
    const points = this._buildBoltPoints(player.x, startY, impactX, endY, fx);

    const glow = this._track(scene.add.graphics().setDepth(fx.depth));
    const core = this._track(scene.add.graphics().setDepth(fx.depth + 1));
    this._strokeBolt(glow, points, stage.visual.glowThickness, fx.glowColor, 0.34);
    this._strokeBolt(core, points, stage.visual.boltThickness, fx.coreColor, 1);
    this._drawBranches(glow, core, points, stage);
    this._fadeAndDestroy([glow, core], fx.boltLifetimeMs);
    this._spawnImpactRings(impactX, impactY, stage);
    this._spawnSparks(impactX, impactY, stage);
    this._spawnFlash(stage);
    this._spawnLabel(impactX, impactY, stage);
    this._shake(stage);
  }

  _buildBoltPoints(startX, startY, endX, endY, fx) {
    const points = [];
    for (let index = 0; index <= fx.boltSegments; index += 1) {
      const progress = index / fx.boltSegments;
      const jitter = index === 0 || index === fx.boltSegments
        ? 0
        : (Math.random() - 0.5) * fx.boltJitterPx * 2;
      points.push({
        x: startX + (endX - startX) * progress + jitter,
        y: startY + (endY - startY) * progress,
      });
    }
    return points;
  }

  _strokeBolt(graphics, points, thickness, color, alpha) {
    graphics.lineStyle(thickness, color, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.strokePath();
  }

  _drawBranches(glow, core, points, stage) {
    const fx = this.config.impactFx;
    for (let index = 0; index < stage.visual.branchCount; index += 1) {
      const anchorIndex = 2 + Math.floor(Math.random() * Math.max(1, points.length - 4));
      const anchor = points[anchorIndex];
      const side = index % 2 === 0 ? -1 : 1;
      const length = fx.branchLengthPx * (0.55 + Math.random() * 0.7);
      const end = {
        x: anchor.x + side * length,
        y: anchor.y + length * (0.2 + Math.random() * 0.35),
      };
      glow.lineStyle(Math.max(2, stage.visual.boltThickness + 5), fx.glowColor, 0.2);
      glow.lineBetween(anchor.x, anchor.y, end.x, end.y);
      core.lineStyle(Math.max(1, stage.visual.boltThickness * 0.45), fx.coreColor, 0.8);
      core.lineBetween(anchor.x, anchor.y, end.x, end.y);
    }
  }

  _spawnImpactRings(x, y, stage) {
    const scene = this.scene;
    const fx = this.config.impactFx;
    for (let index = 0; index < stage.visual.ringCount; index += 1) {
      const ring = this._track(scene.add.graphics().setPosition(x, y).setDepth(fx.depth));
      ring.lineStyle(Math.max(1, stage.visual.boltThickness - 1), stage.visual.accent, 0.75);
      ring.strokeEllipse(0, 0, 26 + index * 8, 10 + index * 3);
      if (scene.tweens?.add) {
        scene.tweens.add({
          targets: ring,
          scaleX: 2.4 + index * 0.3,
          scaleY: 2 + index * 0.2,
          alpha: 0,
          duration: fx.ringLifetimeMs + index * 45,
          ease: "Cubic.Out",
          onComplete: () => this._dispose(ring),
        });
      } else {
        this._delayedDispose(ring, fx.ringLifetimeMs);
      }
    }
  }

  _spawnSparks(x, y, stage) {
    const scene = this.scene;
    const fx = this.config.impactFx;
    if (!scene.add?.circle) return;
    for (let index = 0; index < stage.visual.sparkCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 24 + Math.random() * 70;
      const spark = this._track(scene.add.circle(
        x,
        y,
        1.5 + Math.random() * 2,
        index % 3 === 0 ? fx.coreColor : stage.visual.accent,
        0.95,
      ).setDepth(fx.depth + 2));
      if (scene.tweens?.add) {
        scene.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance * 0.55,
          alpha: 0,
          scale: 0.25,
          duration: fx.sparkLifetimeMs * (0.7 + Math.random() * 0.6),
          ease: "Quad.Out",
          onComplete: () => this._dispose(spark),
        });
      } else {
        this._delayedDispose(spark, fx.sparkLifetimeMs);
      }
    }
  }

  _spawnFlash(stage) {
    const scene = this.scene;
    const fx = this.config.impactFx;
    if (!scene.add?.rectangle) return;
    const width = scene.scale?.width || scene.config?.viewportWidth || 1024;
    const height = scene.scale?.height || scene.config?.viewportHeight || 768;
    const flash = this._track(scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      fx.flashColor,
      stage.visual.flashAlpha,
    ).setScrollFactor(0).setDepth(this.config.timingBar.depth - 1));
    this._fadeAndDestroy([flash], fx.flashLifetimeMs);
  }

  _spawnLabel(x, y, stage) {
    const scene = this.scene;
    const fx = this.config.impactFx;
    if (!scene.add?.text) return;
    const label = this._track(scene.add.text(
      x,
      y - 18,
      `SLAM ${stage.visual.label}  •  ${stage.damageMultiplier}×`,
      {
        fontFamily: fx.labelFont,
        fontSize: fx.labelFontSizes[stage.number - 1],
        color: stage.visual.accentCss,
        fontStyle: "bold",
        stroke: "#050814",
        strokeThickness: 5,
      },
    ).setOrigin(0.5).setDepth(fx.depth + 3));
    if (scene.tweens?.add) {
      scene.tweens.add({
        targets: label,
        y: y - fx.labelRisePx,
        alpha: 0,
        scale: 1.12,
        duration: fx.labelLifetimeMs,
        ease: "Cubic.Out",
        onComplete: () => this._dispose(label),
      });
    } else {
      this._delayedDispose(label, fx.labelLifetimeMs);
    }
  }

  _shake(stage) {
    const scene = this.scene;
    if (scene.shakeSystem?.shake) {
      scene.shakeSystem.shake(stage.visual.shakeSignature);
      return;
    }
    scene.cameras?.main?.shake?.(
      stage.visual.fallbackShakeDurationMs,
      stage.visual.fallbackShakeIntensity,
    );
  }

  _fadeAndDestroy(targets, duration) {
    if (this.scene?.tweens?.add) {
      this.scene.tweens.add({
        targets,
        alpha: 0,
        duration,
        ease: "Quad.Out",
        onComplete: () => targets.forEach((target) => this._dispose(target)),
      });
      return;
    }
    targets.forEach((target) => this._delayedDispose(target, duration));
  }

  _delayedDispose(target, delayMs) {
    if (this.scene?.time?.delayedCall) {
      this.scene.time.delayedCall(delayMs, () => this._dispose(target));
    }
  }

  _track(object) {
    if (object) this.activeObjects.add(object);
    return object;
  }

  _dispose(object) {
    if (!object) return;
    this.activeObjects.delete(object);
    object.destroy?.();
  }

  destroy() {
    this.activeObjects.forEach((object) => object.destroy?.());
    this.activeObjects.clear();
    this.scene = null;
  }
}

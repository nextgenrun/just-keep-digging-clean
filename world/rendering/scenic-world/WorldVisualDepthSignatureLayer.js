import { WORLD_VISUAL_DEPTH_MOTION } from "../../../values/worldVisualDepthMotion.js";

const TAU = Math.PI * 2;

function wrap(value) {
  return ((value % 1) + 1) % 1;
}

function seededUnit(column, row, index) {
  const value = Math.sin(
    (column + 1) * 12.9898 + (row + 1) * 78.233 + (index + 1) * 37.719
  ) * 43758.5453;
  return value - Math.floor(value);
}

function strokePolyline(graphics, points, width, tint, alpha) {
  if (points.length < 2 || alpha <= 0) return;
  graphics.lineStyle(width, tint, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index].x, points[index].y);
  }
  graphics.strokePath();
}

function segmentLane(segment, drawing) {
  return {
    left: segment.baseX + segment.widthPx * drawing.laneLeftRatio,
    right: segment.baseX + segment.widthPx * drawing.laneRightRatio,
    top: segment.baseY + segment.heightPx * drawing.laneTopRatio,
    bottom: segment.baseY + segment.heightPx * drawing.laneBottomRatio,
  };
}

export class WorldVisualDepthSignatureLayer {
  constructor(scene, backdropConfig, config = WORLD_VISUAL_DEPTH_MOTION) {
    this.scene = scene;
    this.backdropConfig = backdropConfig;
    this.config = config;
    this.graphics = null;
    this.masterTween = null;
    this.tweenState = { strength: config.tween.minStrength };
    this.usesMasterTween = false;
    this.lastDrawTime = Number.NEGATIVE_INFINITY;
    this.hiddenForFps = false;
  }

  create() {
    const blendMode = Phaser.BlendModes[this.config.drawing.blendMode]
      || Phaser.BlendModes.ADD;
    this.graphics = this.scene.add.graphics()
      .setDepth(this.backdropConfig.render.signatureDepth)
      .setBlendMode(blendMode);
    this.graphics.name = "world-visual-depth-signature-motion";
    if (this.scene.tweens?.add) {
      this.masterTween = this.scene.tweens.add({
        targets: this.tweenState,
        strength: this.config.tween.maxStrength,
        duration: this.config.tween.periodMs,
        ease: this.config.tween.ease,
        yoyo: true,
        repeat: -1,
      });
      this.usesMasterTween = true;
    }
    return this.graphics;
  }

  update(time, regionViews, lighting) {
    if (!this.graphics) return;
    const fps = Number(this.scene.game?.loop?.actualFps) || 60;
    const motion = this.backdropConfig.motion;
    if (fps < motion.disableBelowFps) {
      if (!this.hiddenForFps) this.graphics.clear();
      this.hiddenForFps = true;
      return;
    }
    this.hiddenForFps = false;

    const reduced = fps < motion.reduceBelowFps;
    const updateMs = reduced ? motion.reducedUpdateMs : motion.ambientUpdateMs;
    const now = Number(time) || 0;
    if (now - this.lastDrawTime < updateMs) return;
    this.lastDrawTime = now;

    const drawing = this.config.drawing;
    const maxSegments = reduced ? drawing.reducedMaxSegments : drawing.maxSegments;
    const entries = this._collectSegments(regionViews, maxSegments);
    this.graphics.clear();
    if (!entries.length) return;

    const tweenStrength = this._resolveTweenStrength(now);
    const lightning = Number(lighting?.lightning) || 0;
    const particleLimit = reduced
      ? drawing.reducedParticlesPerSegment
      : drawing.maxParticlesPerSegment;
    const particlesPerSegment = Math.max(
      1,
      Math.min(
        particleLimit,
        Math.ceil(entries[0].profile.particleCount / entries.length)
      )
    );

    for (const entry of entries) {
      const cycle = wrap(now / entry.profile.periodMs);
      const phase = cycle * TAU + entry.segment.phase;
      const alpha = Math.min(
        1,
        drawing.signatureAlpha * entry.profile.glowStrength * tweenStrength
          + lightning * drawing.lightningAlpha
      );
      this._drawSignature(entry.segment, entry.profile, cycle, phase, alpha);
      this._drawParticles(
        entry.segment,
        entry.profile,
        now,
        particlesPerSegment,
        alpha * drawing.particleAlpha
      );
    }
  }

  _resolveTweenStrength(time) {
    if (this.usesMasterTween) return this.tweenState.strength;
    const { minStrength, maxStrength, periodMs } = this.config.tween;
    const eased = Math.sin(wrap(time / periodMs) * Math.PI) ** 2;
    return minStrength + (maxStrength - minStrength) * eased;
  }

  _collectSegments(regionViews, limit) {
    const entries = [];
    for (const view of regionViews) {
      const profile = this.config.profiles[view.region.id];
      if (!profile) continue;
      for (const segment of view.segments.values()) {
        entries.push({ segment, profile });
        if (entries.length >= limit) return entries;
      }
    }
    return entries;
  }

  _drawSignature(segment, profile, cycle, phase, alpha) {
    switch (profile.kind) {
      case "organic": this._drawOrganic(segment, profile, cycle, phase, alpha); break;
      case "rain": this._drawRain(segment, profile, cycle, alpha); break;
      case "dust": this._drawDust(segment, profile, phase, alpha); break;
      case "shimmer": this._drawShimmer(segment, profile, cycle, alpha); break;
      case "heat": this._drawHeat(segment, profile, phase, alpha); break;
      case "steam": this._drawSteam(segment, profile, cycle, alpha); break;
      case "ash": this._drawAsh(segment, profile, phase, alpha); break;
      case "surge": this._drawSurge(segment, profile, cycle, alpha); break;
      case "prism": this._drawPrism(segment, profile, phase, alpha); break;
      case "cosmic": this._drawCosmic(segment, profile, phase, alpha); break;
      default: break;
    }
  }

  _drawOrganic(segment, profile, cycle, phase, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const baseX = lane.left + (lane.right - lane.left) * ratio;
      const points = [];
      for (let step = 0; step <= d.lineSteps; step += 1) {
        const progress = step / d.lineSteps;
        points.push({
          x: baseX + Math.sin(phase + progress * TAU + band) * segment.widthPx
            * d.waveAmplitudeRatio,
          y: lane.bottom - (lane.bottom - lane.top) * progress,
        });
      }
      strokePolyline(this.graphics, points, d.lineWidthPx, profile.accent, alpha);
      const pulseY = lane.bottom - (lane.bottom - lane.top) * wrap(cycle + ratio);
      this.graphics.fillStyle(profile.secondary, alpha * d.secondaryAlphaScale);
      this.graphics.fillCircle(baseX, pulseY, d.particleRadiusPx * d.lineWidthPx);
    }
  }

  _drawRain(segment, profile, cycle, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    const spanY = lane.bottom - lane.top;
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const x = lane.left + (lane.right - lane.left) * ratio;
      const startY = lane.top + spanY * wrap(cycle + ratio);
      strokePolyline(this.graphics, [
        { x, y: startY },
        { x: x - profile.parallaxPx, y: Math.min(lane.bottom, startY + spanY * d.streakLengthRatio) },
      ], d.lineWidthPx, profile.accent, alpha);
    }
    const sweepY = lane.top + spanY * wrap(cycle * d.secondaryAlphaScale);
    strokePolyline(this.graphics, [
      { x: lane.left, y: sweepY },
      { x: lane.right, y: sweepY },
    ], d.strongLineWidthPx, profile.secondary, alpha * d.secondaryAlphaScale);
  }

  _drawDust(segment, profile, phase, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    const shaftWidth = segment.widthPx * d.shaftWidthRatio;
    this.graphics.fillStyle(profile.accent, alpha * d.secondaryAlphaScale);
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const sway = Math.sin(phase + band) * profile.parallaxPx;
      const x = lane.left + (lane.right - lane.left) * ratio + sway;
      this.graphics.fillRect(x - shaftWidth * 0.5, lane.top, shaftWidth, lane.bottom - lane.top);
    }
  }

  _drawShimmer(segment, profile, cycle, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    const spanY = lane.bottom - lane.top;
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const x = lane.left + (lane.right - lane.left) * ratio;
      strokePolyline(this.graphics, [
        { x, y: lane.top },
        { x, y: lane.bottom },
      ], d.lineWidthPx, band % 2 ? profile.secondary : profile.accent, alpha);
      const glintY = lane.top + spanY * wrap(cycle + ratio);
      this.graphics.fillStyle(profile.accent, alpha);
      this.graphics.fillRect(
        x - d.strongLineWidthPx,
        glintY,
        d.strongLineWidthPx * d.lineWidthPx,
        spanY * d.streakLengthRatio
      );
    }
  }

  _drawHeat(segment, profile, phase, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const baseY = lane.top + (lane.bottom - lane.top) * ratio;
      const points = [];
      for (let step = 0; step <= d.lineSteps; step += 1) {
        const progress = step / d.lineSteps;
        points.push({
          x: lane.left + (lane.right - lane.left) * progress,
          y: baseY + Math.sin(phase + progress * TAU + band) * segment.heightPx
            * d.waveAmplitudeRatio,
        });
      }
      strokePolyline(this.graphics, points, d.strongLineWidthPx, profile.accent, alpha);
    }
  }

  _drawSteam(segment, profile, cycle, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    this.graphics.fillStyle(profile.secondary, alpha * d.secondaryAlphaScale);
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const x = lane.left + (lane.right - lane.left) * ratio;
      const y = lane.bottom - (lane.bottom - lane.top) * wrap(cycle + ratio);
      this.graphics.fillCircle(x, y, d.steamRadiusPx * (ratio + d.centerYRatio));
    }
    strokePolyline(this.graphics, [
      { x: lane.left, y: lane.bottom },
      { x: lane.right, y: lane.bottom },
    ], d.strongLineWidthPx, profile.accent, alpha);
  }

  _drawAsh(segment, profile, phase, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    const points = [];
    for (let step = 0; step <= d.lineSteps; step += 1) {
      const progress = step / d.lineSteps;
      points.push({
        x: lane.left + (lane.right - lane.left) * progress,
        y: lane.top + (lane.bottom - lane.top) * progress
          + Math.sin(phase + step) * segment.heightPx * d.waveAmplitudeRatio,
      });
    }
    strokePolyline(this.graphics, points, d.lineWidthPx, profile.accent, alpha);
  }

  _drawSurge(segment, profile, cycle, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    for (let band = 0; band < profile.bandCount; band += 1) {
      const ratio = (band + 1) / (profile.bandCount + 1);
      const y = lane.top + (lane.bottom - lane.top) * ratio;
      const x = lane.left + (lane.right - lane.left) * wrap(cycle + ratio);
      const trail = (lane.right - lane.left) * d.surgeTrailRatio;
      strokePolyline(this.graphics, [
        { x: Math.max(lane.left, x - trail), y },
        { x, y },
      ], d.strongLineWidthPx, profile.accent, alpha);
      this.graphics.fillStyle(profile.secondary, alpha);
      this.graphics.fillCircle(x, y, d.particleRadiusPx * d.lineWidthPx);
    }
  }

  _drawPrism(segment, profile, phase, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    const centerX = lane.left + (lane.right - lane.left) * d.centerXRatio;
    const centerY = lane.top + (lane.bottom - lane.top) * d.centerYRatio;
    for (let band = 0; band < profile.bandCount; band += 1) {
      const scale = (band + 1) / profile.bandCount;
      const points = [];
      for (let step = 0; step <= d.lineSteps; step += 1) {
        const angle = phase + step / d.lineSteps * TAU + band;
        points.push({
          x: centerX + Math.cos(angle) * segment.widthPx * d.orbitRadiusXRatio * scale,
          y: centerY + Math.sin(angle) * segment.heightPx * d.orbitRadiusYRatio * scale,
        });
      }
      strokePolyline(
        this.graphics,
        points,
        d.lineWidthPx,
        band % 2 ? profile.secondary : profile.accent,
        alpha
      );
    }
  }

  _drawCosmic(segment, profile, phase, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    for (let ribbon = 0; ribbon < 2; ribbon += 1) {
      const points = [];
      for (let step = 0; step <= d.lineSteps; step += 1) {
        const progress = step / d.lineSteps;
        const direction = ribbon ? -1 : 1;
        points.push({
          x: lane.left + (lane.right - lane.left) * progress,
          y: lane.top + (lane.bottom - lane.top) * (
            d.centerYRatio + direction * Math.sin(phase + progress * TAU) * d.waveAmplitudeRatio
          ),
        });
      }
      strokePolyline(
        this.graphics,
        points,
        d.strongLineWidthPx,
        ribbon ? profile.secondary : profile.accent,
        alpha
      );
    }
  }

  _drawParticles(segment, profile, time, count, alpha) {
    const d = this.config.drawing;
    const lane = segmentLane(segment, d);
    const spanX = lane.right - lane.left;
    const spanY = lane.bottom - lane.top;
    const travel = time / 1000 * profile.particleSpeed * d.particleTimeScale;
    for (let index = 0; index < count; index += 1) {
      const seedX = seededUnit(segment.column, segment.row, index);
      const seedY = seededUnit(segment.row, segment.column, index + count);
      let x = seedX;
      let y = seedY;
      if (profile.direction === "up") y = wrap(y - travel);
      if (profile.direction === "down") y = wrap(y + travel);
      if (profile.direction === "side") x = wrap(x + travel);
      if (profile.direction === "orbit") {
        const angle = (seedX + travel) * TAU;
        x = d.centerXRatio + Math.cos(angle) * d.orbitRadiusXRatio * seedY;
        y = d.centerYRatio + Math.sin(angle) * d.orbitRadiusYRatio * seedY;
      }
      x = wrap(x + Math.sin(time / profile.periodMs * TAU + seedY * TAU)
        * profile.particleDrift * d.driftScale);
      const px = lane.left + spanX * x;
      const py = lane.top + spanY * y;
      const tint = index % 4 ? profile.accent : profile.secondary;
      this.graphics.fillStyle(tint, alpha);
      if (profile.kind === "rain" || profile.kind === "shimmer" || profile.kind === "ash") {
        this.graphics.fillRect(
          px,
          py,
          d.lineWidthPx,
          Math.max(d.lineWidthPx, spanY * d.streakLengthRatio * seedY)
        );
      } else if (profile.kind === "steam") {
        this.graphics.fillCircle(px, py, d.steamRadiusPx * (d.centerYRatio + seedY));
      } else {
        this.graphics.fillCircle(px, py, d.particleRadiusPx * (d.centerYRatio + seedY));
      }
    }
  }

  destroy() {
    this.masterTween?.stop();
    this.masterTween?.remove?.();
    this.masterTween = null;
    this.graphics?.destroy();
    this.graphics = null;
  }
}

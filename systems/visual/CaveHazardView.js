import { CAVE_GAMEPLAY_CONFIG } from "../../values/caveGameplay.js";

function pulseBetween(time, phase, minimum, maximum, speed) {
  const wave = (Math.sin(time * speed + phase) + 1) * 0.5;
  return minimum + (maximum - minimum) * wave;
}

/**
 * Draws telegraphed cave traps without owning collision or GP consequences.
 */
export class CaveHazardView {
  constructor(scene, config = CAVE_GAMEPLAY_CONFIG.hazards) {
    this.scene = scene;
    this.config = config;
    this.baseGraphics = null;
    this.glowGraphics = null;
  }

  create() {
    this.baseGraphics = this.scene.add.graphics().setDepth(this.config.render.baseDepth);
    this.glowGraphics = this.scene.add.graphics().setDepth(this.config.render.glowDepth);
    const addBlend = globalThis.Phaser?.BlendModes?.ADD;
    if (addBlend !== undefined) this.glowGraphics.setBlendMode(addBlend);
  }

  render(entries, time, tileSize) {
    if (!this.baseGraphics || !this.glowGraphics) return;
    this.baseGraphics.clear();
    this.glowGraphics.clear();
    for (const entry of entries) {
      if (entry.hazard.kind === "spike-run") {
        this._drawSpikes(entry.hazard, entry.state, time, tileSize);
      } else if (entry.hazard.kind === "ember-vent") {
        this._drawVent(entry.hazard, entry.state, time, tileSize);
      } else {
        this._drawGate(entry.hazard, entry.state, time, tileSize);
      }
    }
  }

  destroy() {
    this.baseGraphics?.destroy();
    this.glowGraphics?.destroy();
    this.baseGraphics = null;
    this.glowGraphics = null;
  }

  _drawGate(hazard, state, time, tileSize) {
    const render = this.config.render;
    const x = (hazard.centerTx + 0.5) * tileSize;
    const top = hazard.ceilingY * tileSize;
    const bottom = hazard.floorY * tileSize;
    const nodeRadius = render.nodeRadiusTiles * tileSize;
    const phase = hazard.phaseMs * render.motionRadiansPerMs;
    const telegraphPulse = pulseBetween(
      time,
      phase,
      render.telegraphPulseMin,
      render.telegraphPulseMax,
      render.motionRadiansPerMs,
    );
    const activePulse = pulseBetween(
      time,
      phase,
      render.activePulseMin,
      render.activePulseMax,
      render.motionRadiansPerMs,
    );

    this.baseGraphics.fillStyle(hazard.color, render.inactiveAlpha);
    this.baseGraphics.fillCircle(x, top + nodeRadius, nodeRadius);
    this.baseGraphics.fillCircle(x, bottom - nodeRadius, nodeRadius);

    if (!state.active && !state.telegraph) {
      this.baseGraphics.lineStyle(
        render.lineWidthTiles * tileSize,
        hazard.color,
        render.inactiveAlpha,
      );
      this.baseGraphics.lineBetween(x, top + nodeRadius, x, bottom - nodeRadius);
      return;
    }

    const alpha = state.active
      ? render.activeAlpha * activePulse
      : render.telegraphAlpha * telegraphPulse;
    const jitter = render.gateJitterTiles * tileSize * (state.active ? 1 : telegraphPulse);
    const lineWidth = render.lineWidthTiles
      * tileSize
      * (state.active ? render.gateActiveWidthScale : render.gateTelegraphWidthScale);
    for (const graphics of [this.baseGraphics, this.glowGraphics]) {
      const glowPass = graphics === this.glowGraphics;
      graphics.lineStyle(
        lineWidth * (glowPass ? render.gateGlowWidthScale : 1),
        glowPass ? hazard.glowColor : hazard.color,
        alpha * (glowPass ? render.glowAlpha : 1),
      );
      graphics.beginPath();
      graphics.moveTo(x, top + nodeRadius);
      for (let index = 1; index < render.gateSegments; index += 1) {
        const ratio = index / render.gateSegments;
        const offset = Math.sin(
          time * render.motionRadiansPerMs
          + index * render.segmentPhaseStep
          + phase
        ) * jitter;
        graphics.lineTo(x + offset, top + (bottom - top) * ratio);
      }
      graphics.lineTo(x, bottom - nodeRadius);
      graphics.strokePath();
    }

    this.glowGraphics.fillStyle(hazard.glowColor, alpha * render.glowAlpha);
    for (let index = 0; index < render.sparkCount; index += 1) {
      const ratio = (index + 1) / (render.sparkCount + 1);
      const offset = Math.sin(
        time * render.motionRadiansPerMs
        + index * render.segmentPhaseStep
        + phase
      ) * jitter;
      this.glowGraphics.fillCircle(
        x + offset,
        top + (bottom - top) * ratio,
        render.sparkRadiusTiles * tileSize,
      );
    }
  }

  _drawSpikes(hazard, state, time, tileSize) {
    const render = this.config.render;
    const left = hazard.startTx * tileSize;
    const right = (hazard.endTx + 1) * tileSize;
    const floorY = hazard.floorY * tileSize;
    const spikeWidth = render.spikeWidthTiles * tileSize;
    const spikeHeight = render.spikeHeightTiles * tileSize;
    const phase = hazard.phaseMs * render.motionRadiansPerMs;
    const pulse = pulseBetween(
      time,
      phase,
      render.activePulseMin,
      render.activePulseMax,
      render.motionRadiansPerMs,
    );

    this.baseGraphics.fillStyle(hazard.color, render.activeAlpha);
    this.baseGraphics.fillRect(
      left,
      floorY - render.floorMarkHeightTiles * tileSize,
      right - left,
      render.floorMarkHeightTiles * tileSize,
    );
    let index = 0;
    for (let x = left; x < right; x += spikeWidth) {
      const width = Math.min(spikeWidth, right - x);
      const tipX = x + width * 0.5;
      const tipY = floorY - spikeHeight * (
        render.activePulseMin
        + (pulse - render.activePulseMin) * (
          (index % 2) * render.spikeAlternatingAmplitude
          + render.spikeAlternatingBase
        )
      );
      this.baseGraphics.fillTriangle(x, floorY, x + width, floorY, tipX, tipY);
      const innerHalfWidth = width * render.spikeInnerWidthRatio * 0.5;
      const innerTipY = floorY
        - (floorY - tipY) * render.spikeInnerHeightRatio;
      this.glowGraphics.fillStyle(
        hazard.glowColor,
        render.glowAlpha * render.spikeInnerAlpha * pulse,
      );
      this.glowGraphics.fillTriangle(
        tipX - innerHalfWidth,
        floorY,
        tipX + innerHalfWidth,
        floorY,
        tipX,
        innerTipY,
      );
      this.glowGraphics.fillStyle(hazard.glowColor, render.glowAlpha * pulse);
      this.glowGraphics.fillCircle(
        tipX,
        tipY,
        render.spikeTipGlowTiles * tileSize,
      );
      index += 1;
    }
  }

  _drawVent(hazard, state, time, tileSize) {
    const render = this.config.render;
    const x = (hazard.centerTx + 0.5) * tileSize;
    const floorY = hazard.floorY * tileSize;
    const width = render.ventWidthTiles * tileSize;
    const availableHeight = (
      hazard.floorY - hazard.ceilingY - render.ventCeilingClearanceTiles
    ) * tileSize;
    const height = Math.min(render.ventHeightTiles * tileSize, availableHeight);
    const phase = hazard.phaseMs * render.motionRadiansPerMs;
    const pulse = pulseBetween(
      time,
      phase,
      state.active ? render.activePulseMin : render.telegraphPulseMin,
      state.active ? render.activePulseMax : render.telegraphPulseMax,
      render.motionRadiansPerMs,
    );
    const markAlpha = state.active
      ? render.activeAlpha
      : state.telegraph ? render.telegraphAlpha * pulse : render.inactiveAlpha;

    this.baseGraphics.fillStyle(hazard.color, markAlpha);
    this.baseGraphics.fillEllipse(
      x,
      floorY,
      width,
      render.floorMarkHeightTiles * tileSize * 2,
    );
    if (!state.active) {
      this.glowGraphics.lineStyle(
        render.lineWidthTiles * tileSize,
        hazard.glowColor,
        markAlpha * render.glowAlpha,
      );
      this.glowGraphics.strokeEllipse(
        x,
        floorY,
        width * pulse,
        width * render.ventTelegraphEllipseHeightRatio,
      );
      return;
    }

    const tipSway = Math.sin(
      time * render.motionRadiansPerMs + phase,
    ) * width * render.ventTipSwayRatio;
    this.glowGraphics.fillStyle(
      hazard.glowColor,
      render.glowAlpha * render.ventBoundsGlowAlphaScale * pulse,
    );
    this.glowGraphics.fillRect(x - width * 0.5, floorY - height, width, height);
    this.glowGraphics.fillStyle(hazard.glowColor, render.glowAlpha * pulse);
    this.glowGraphics.fillTriangle(
      x - width * 0.5,
      floorY,
      x + width * 0.5,
      floorY,
      x + tipSway,
      floorY - height,
    );
    const sideWidth = width * render.ventSideTongueWidthRatio;
    const sideHeight = height * render.ventSideTongueHeightRatio;
    this.glowGraphics.fillTriangle(
      x - width * 0.5,
      floorY,
      x - width * 0.5 + sideWidth,
      floorY,
      x - width * 0.18 - tipSway * 0.25,
      floorY - sideHeight,
    );
    this.glowGraphics.fillTriangle(
      x + width * 0.5 - sideWidth,
      floorY,
      x + width * 0.5,
      floorY,
      x + width * 0.18 - tipSway * 0.25,
      floorY - sideHeight * 0.82,
    );
    this.baseGraphics.fillStyle(hazard.color, render.activeAlpha * pulse);
    this.baseGraphics.fillTriangle(
      x - width * render.ventCoreWidthRatio * 0.5,
      floorY,
      x + width * render.ventCoreWidthRatio * 0.5,
      floorY,
      x + tipSway * 0.35,
      floorY - height * render.ventCoreHeightRatio,
    );
    for (let index = 0; index < render.ventParticleCount; index += 1) {
      const ratio = (index + 1) / (render.ventParticleCount + 1);
      const offset = Math.sin(
        time * render.motionRadiansPerMs
        + index * render.segmentPhaseStep
        + phase
      ) * width * render.ventParticleSwayRatio;
      this.baseGraphics.fillCircle(
        x + offset,
        floorY - height * ratio,
        render.sparkRadiusTiles * tileSize * (1 + ratio),
      );
    }
  }
}

import { clamp01, lerp } from "../../values/mathUtils.js";

export class WeatherImpactParticleController {
  constructor(scene, weatherConfig, visualAssets) {
    this.scene = scene;
    this.weatherConfig = weatherConfig;
    this.visualAssets = visualAssets;
    this.actors = [];
    this._spritePool = [];
  }

  update(delta, events = []) {
    if (!this.visualAssets) return;
    this._updateActors(Math.min(Math.max(delta || 0, 0), 100));
    events.forEach((event) => this._spawnEvent(event));
  }

  destroy() {
    this.actors.forEach((actor) => actor.sprite?.destroy?.());
    this._spritePool.forEach((sprite) => sprite?.destroy?.());
    this.actors.length = 0;
    this._spritePool.length = 0;
  }

  _spawnEvent(event) {
    if (event.kind === "snow") {
      const chance = this.weatherConfig.splashes.impactVfx.snowPowderChance;
      if (Math.random() <= chance) this._spawnActor("snowPowder", event);
      return;
    }

    this._spawnActor("rainSplash", event);
    if ((event.normalY ?? -1) < 0
      && Math.random() <= this.weatherConfig.splashes.impactVfx.rippleChance) {
      this._spawnActor("rainRipple", event);
    }
  }

  _spawnActor(kind, event) {
    const cfg = this.weatherConfig.splashes.impactVfx;
    if (this.actors.length >= cfg.maxActive) return;
    const profile = this._profile(kind);
    const frames = this.visualAssets.frames[profile.frameGroup];
    if (!frames?.length) return;

    const textureKey = this.visualAssets.groupTextureKeys?.[profile.frameGroup] || this.visualAssets.textureKey;
    const sprite = this._spritePool.pop()
      || this.scene.add.image(0, 0, textureKey);
    const normalX = event.normalX ?? 0;
    const normalY = event.normalY ?? -1;
    const groundContact = normalY < 0;
    const sourceScale = groundContact ? 1 : cfg.ceilingScale;
    const rotation = Math.atan2(normalY, normalX) + Math.PI * 0.5;
    sprite
      .setTexture(textureKey, frames[0])
      .setOrigin(0.5, kind === "snowPowder" ? 0.5 : (this.visualAssets.impactOriginY ?? 0.5))
      .setScrollFactor(1)
      .setDepth(this.weatherConfig.renderDepths.rain + profile.depthOffset)
      .setPosition(
        event.worldX + normalX * cfg.groundOffsetPx,
        event.worldY + normalY * cfg.groundOffsetPx,
      )
      .setRotation(rotation)
      .setAlpha(0)
      .setVisible(true);
    this.actors.push({
      kind,
      ageMs: 0,
      durationMs: profile.durationMs,
      alpha: cfg.startAlpha * clamp01(event.alpha ?? 1),
      sourceScale,
      frames,
      widthPx: profile.widthPx,
      heightPx: profile.heightPx,
      sprite,
    });
  }

  _updateActors(deltaMs) {
    const cfg = this.weatherConfig.splashes.impactVfx;
    let survivorCount = 0;
    for (const actor of this.actors) {
      actor.ageMs += deltaMs;
      const progress = clamp01(actor.ageMs / Math.max(1, actor.durationMs));
      if (progress >= 1) {
        actor.sprite.setVisible(false).setAlpha(0);
        this._spritePool.push(actor.sprite);
        continue;
      }

      const frameIndex = Math.min(
        actor.frames.length - 1,
        Math.floor(progress * actor.frames.length),
      );
      const scale = lerp(cfg.startScale, cfg.endScale, progress) * actor.sourceScale;
      actor.sprite
        .setFrame(actor.frames[frameIndex])
        .setDisplaySize(actor.widthPx * scale, actor.heightPx * scale)
        .setAlpha(actor.alpha * (1 - progress));
      this.actors[survivorCount++] = actor;
    }
    this.actors.length = survivorCount;
  }

  _profile(kind) {
    const cfg = this.weatherConfig.splashes.impactVfx;
    if (kind === "rainRipple") {
      return {
        frameGroup: "rainRipples",
        durationMs: cfg.rippleDurationMs,
        widthPx: cfg.rippleWidthPx,
        heightPx: cfg.rippleHeightPx,
        depthOffset: cfg.rippleDepthOffset,
      };
    }
    if (kind === "snowPowder") {
      return {
        frameGroup: "snowPowder",
        durationMs: cfg.snowPowderDurationMs,
        widthPx: cfg.snowPowderWidthPx,
        heightPx: cfg.snowPowderHeightPx,
        depthOffset: cfg.snowPowderDepthOffset,
      };
    }
    return {
      frameGroup: "rainSplashes",
      durationMs: cfg.splashDurationMs,
      widthPx: cfg.splashWidthPx,
      heightPx: cfg.splashHeightPx,
      depthOffset: cfg.splashDepthOffset,
    };
  }
}

import {
  WORLD_BACKGROUND_AMBIENT_MOTION,
  resolveWorldBackgroundAmbientMotionEnabled,
} from "../../values/worldBackgroundAmbientMotion.js";

export class SkylineWeatherVfxWorldWisps {
  constructor(scene, config, atlas) {
    this.scene = scene;
    this.config = config;
    this.atlas = atlas;
    this.actors = [];
    this.enabled = false;
  }

  create() {
    const master = this.scene.worldBackgroundMasterSystem;
    this.enabled = resolveWorldBackgroundAmbientMotionEnabled()
      && master?.enabled === true;
    if (!this.enabled) return false;

    const groups = [
      ["smoke", WORLD_BACKGROUND_AMBIENT_MOTION.anchors.townSmoke],
      [
        "steam",
        master.depthEnabled === true
          ? WORLD_BACKGROUND_AMBIENT_MOTION.anchors.level2Steam
          : [],
      ],
    ];
    groups.forEach(([kind, anchors]) => anchors.forEach((anchor, index) => {
      const frames = this.config.frames.atmosphere[kind];
      const frame = frames[index % frames.length];
      const sprite = this.scene.add.image(
        0,
        0,
        this.atlas.textureKey("atmosphere"),
        this.atlas.frame("atmosphere", frame)
      ).setDepth(this.config.renderDepths.wisps).setOrigin(0.5).setAlpha(0).setVisible(false);
      this.actors.push({ ...anchor, kind, sprite });
    }));
    return this.actors.length > 0;
  }

  update(time, rain, surface, weather, tint, night) {
    if (!this.enabled) return;
    const tileSize = this.scene.config.tileSize || 94;
    const view = this.scene.cameras.main.worldView;
    const margin = this.config.wisps.cullMarginPx;
    const master = this.scene.worldBackgroundMasterSystem;
    this.actors.forEach(actor => {
      const baseX = actor.xTile * tileSize;
      const baseY = actor.yTile * tileSize;
      const masterVisible = master?.enabled === true
        && (actor.kind !== "steam" || master.depthEnabled === true);
      const visible = masterVisible && surface > 0.01
        && baseX >= view.x - margin && baseX <= view.right + margin
        && baseY >= view.y - margin && baseY <= view.bottom + margin;
      if (!visible) { actor.sprite.setVisible(false); return; }

      const period = actor.kind === "steam" ? 4600 : 5200;
      const life = ((time / period) + actor.phase) % 1;
      const wind = Math.max(-96, Math.min(96, weather.wind || 0));
      const alpha = actor.kind === "steam"
        ? this.config.wisps.steamAlpha * (0.7 + rain * 0.3)
        : this.config.wisps.smokeAlpha * (1 - rain * 0.72) * (0.8 + night * 0.2);
      actor.sprite.setPosition(baseX + wind * life * 0.18, baseY - life * tileSize * 0.72)
        .setDisplaySize(
          this.config.wisps.sizePx * actor.scale * (0.72 + life * 0.55),
          this.config.wisps.sizePx * actor.scale
        )
        .setTint(tint)
        .setAlpha((1 - life) * alpha * surface)
        .setVisible(true);
    });
  }

  destroy() {
    this.actors.forEach(actor => actor.sprite.destroy());
    this.actors = [];
    this.enabled = false;
  }
}

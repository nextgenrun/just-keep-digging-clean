import { WORLDROOT_SANCTUARY_CONFIG } from "../../values/worldrootSanctuary.js";

/** Ten anchored, non-colliding plant details grow from the existing region state. */
export class WorldrootSanctuaryGrowth {
  constructor(scene, view, config = WORLDROOT_SANCTUARY_CONFIG) {
    this.scene = scene;
    this.view = view;
    this.config = config;
    this.reducedMotion = globalThis.matchMedia?.(config.growth.reducedMotionMediaQuery)?.matches === true;
    this.entries = [];
    this.signature = null;
    for (const [index, placement] of config.growth.placements.entries()) {
      const entry = { regionId: placement.regionId, index, scale: 0, alpha: 0, parts: [] };
      for (const kind of ["vine", "fern"]) {
        const asset = config.growth[kind];
        if (!scene.textures.exists(asset.key)) continue;
        const point = view.sourceToWorld(placement[kind], kind === "fern");
        const origin = config.growth[`${kind}Origin`];
        const image = scene.add.image(point.x, point.y, asset.key)
          .setOrigin(placement.flip ? 1 - origin.x : origin.x, origin.y).setFlipX(placement.flip)
          .setDepth(config.placement.depth + config.placement.layerStep * 3);
        entry.parts.push({ kind, image, source: placement[kind], width: placement[kind].width * view.transform.scaleX,
          height: placement[kind].height * view.transform.scaleY });
      }
      if (!this.reducedMotion && scene.textures.exists(config.growth.leaf.key)) {
        const region = config.regions.find(region => region.id === placement.regionId);
        entry.leafStart = view.sourceToWorld(region);
        entry.leaf = scene.add.image(entry.leafStart.x, entry.leafStart.y, config.growth.leaf.key)
          .setDisplaySize(config.growth.leafSizePx, config.growth.leafSizePx)
          .setDepth(config.placement.depth + config.placement.layerStep * 4);
      }
      this.entries.push(entry);
    }
  }

  sync(snapshot, animate = true) {
    if (!snapshot || snapshot.signature === this.signature) return;
    this.signature = snapshot.signature;
    const config = this.config.growth;
    const hearth = Math.max(0, Math.min(1, ((snapshot.campfireLevel || 1) - 1)
      / (config.campfireMaximumLevel - 1))) * config.campfireScaleBoost;
    for (const entry of this.entries) {
      const memory = snapshot.regionMemories?.find(region => region.id === entry.regionId);
      const known = Math.max(0, Number(memory?.knownCount) || 0);
      const consumed = Math.min(known, Math.max(0, Number(memory?.consumedCount) || 0));
      const growth = Math.min(1, known / this.config.foliage.fullGrowthKnownCount);
      const vitality = known > 0 ? (known - consumed) / known : 0;
      const target = known > 0
        ? { scale: (config.minimumScale + (1 - config.minimumScale) * growth + hearth) * vitality,
          alpha: vitality > 0 ? config.minimumAlpha + (1 - config.minimumAlpha) * growth : 0 }
        : { scale: config.sleepingScale, alpha: config.sleepingAlpha };
      entry.target = target;
      entry.vitality = vitality;
      this.scene.tweens?.killTweensOf?.(entry);
      if (animate && !this.reducedMotion && this.scene.tweens) this.scene.tweens.add({ targets: entry, ...target,
        duration: config.transitionMs, delay: entry.index * config.staggerMs, ease: "Sine.inOut" });
      else Object.assign(entry, target);
    }
    this.update(this.scene.time?.now || 0);
  }

  update(time) {
    const config = this.config.growth;
    for (const entry of this.entries) {
      const phase = time / config.swayPeriodMs * Math.PI * 2 + entry.index * config.phaseStep;
      for (const part of entry.parts) {
        const grounded = part.kind === "fern";
        const point = this.view.sourceToWorld(part.source, grounded);
        const scale = grounded ? this.view.transform.matureScale : this.view.transform.scaleX;
        part.image.setVisible(entry.alpha > 0).setAlpha(entry.alpha)
          .setPosition(point.x, point.y)
          .setDisplaySize(part.source.width * scale * entry.scale, part.source.height * scale * entry.scale)
          .setRotation(this.reducedMotion ? 0 : Math.sin(phase) * config[`${part.kind}SwayRadians`] * entry.vitality);
      }
      if (entry.leaf) {
        entry.leafStart = this.view.sourceToWorld(this.config.regions.find(region => region.id === entry.regionId));
        const t = (time / config.leafPeriodMs + entry.index / this.entries.length) % 1;
        entry.leaf.setVisible(entry.vitality > 0 && entry.alpha > 0)
          .setAlpha(Math.sin(t * Math.PI) * entry.alpha * config.leafAlpha)
          .setPosition(entry.leafStart.x + Math.sin(t * Math.PI) * config.leafDriftPx,
            entry.leafStart.y + t * config.leafFallPx).setRotation(t * Math.PI * 2);
      }
    }
  }

  getDebugSnapshot() {
    return { spriteCount: this.entries.reduce((sum, entry) => sum + entry.parts.length, 0),
      driftingLeaves: this.entries.filter(entry => entry.leaf?.visible).length,
      regions: this.entries.map(entry => ({ id: entry.regionId, scale: entry.scale,
        alpha: entry.alpha, targetScale: entry.target?.scale || 0, vitality: entry.vitality })) };
  }

  destroy() {
    for (const entry of this.entries) {
      this.scene.tweens?.killTweensOf?.(entry);
      entry.parts.forEach(part => part.image.destroy());
      entry.leaf?.destroy();
    }
    this.entries = [];
    this.scene = null;
    this.view = null;
  }
}

import { WORLDROOT_SANCTUARY_CONFIG } from "../../values/worldrootSanctuary.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { getStarRarityFeatureAssetGroupId } from "../../values/runtimeAssetLoading.js";
import { installStarIdentityTextureFrames } from "./installStarIdentityTextureFrames.js";

/** Independent live Star/scar sprites; never awards, consumes, discovers or saves. */
export class WorldrootSanctuaryStars {
  constructor(scene, view, inspect, config = WORLDROOT_SANCTUARY_CONFIG) {
    this.scene = scene;
    this.view = view;
    this.inspect = inspect;
    this.config = config;
    this.entries = [];
    this.groups = new Set();
    this.pending = new Set();
    this.arrivals = new Set();
    this.snapshot = null;
    this.signature = null;
  }

  pointForStar(star, snapshot = this.snapshot) {
    return this.view.sourceToWorld(this.sourcePointForStar(star, snapshot));
  }

  sourcePointForStar(star, snapshot = this.snapshot) {
    const region = this.config.regions.find(entry => entry.id === star?.regionId)
      || this.config.regions[0];
    const members = (snapshot?.starMemories || []).filter(entry => entry.regionId === region.id)
      .map(entry => entry.key || entry.id).sort();
    const ordinal = Math.max(0, members.indexOf(star?.key || star?.id));
    const layout = this.config.stars.layout;
    const radius = members.length > 1 ? Math.sqrt((ordinal + 0.5) / members.length) : 0;
    const angle = ordinal * layout.angleRadians + layout.phaseRadians;
    const memory = snapshot?.regionMemories?.find(entry => entry.id === region.id);
    const growth = Math.max(layout.minimumSpread, this.config.foliage.minimumAwakeScale
      + (1 - this.config.foliage.minimumAwakeScale)
      * Math.min(1, (Number(memory?.knownCount) || 0) / this.config.foliage.fullGrowthKnownCount));
    // All real Star keys, including consumed ones, retain their own organic slot.
    return { x: region.x + Math.cos(angle) * radius * region.size * growth * layout.radiusX,
      y: region.y + Math.sin(angle) * radius * region.size * growth * layout.radiusY };
  }

  _ensureIdentity(identity) {
    const manager = this.scene?.runtimeFeatureAssetManager;
    if (!identity || !manager?.enabled) return;
    const group = getStarRarityFeatureAssetGroupId(identity.rarityIndex);
    if (this.groups.has(group) || this.pending.has(group)) return;
    this.pending.add(group);
    manager.ensureGroup(group, { consumer: this.config.stars.consumer, adoptExisting: true })
      .then(result => {
        this.pending.delete(group);
        if (!this.scene) {
          manager.releaseGroup(group, this.config.stars.consumer);
          return;
        }
        if (result.ready) {
          this.groups.add(group);
          this.signature = null;
          this.sync(this.snapshot);
        } else manager.releaseGroup(group, this.config.stars.consumer);
      }).catch(() => {
        this.pending.delete(group);
        manager.releaseGroup(group, this.config.stars.consumer);
      });
  }

  sync(snapshot, animate = true) {
    if (!this.scene || !snapshot) return;
    this.snapshot = snapshot;
    if (snapshot.signature === this.signature) return;
    this.signature = snapshot.signature;
    const previous = new Map(this.entries.map(entry => [entry.star.key || entry.star.id, entry]));
    const next = [];
    installStarIdentityTextureFrames(this.scene);
    for (const star of snapshot.starMemories || []) {
      const consumed = star.state === "consumed";
      // Undiscovered signals must never acquire or reveal a named identity.
      const identity = star.discovered === true && star.identityId
        ? STAR_IDENTITY_LIBRARY_CONFIG.identities.find(entry => entry.id === star.identityId)
        : null;
      if (!consumed) this._ensureIdentity(identity);
      const identityReady = identity && this.scene.textures.exists(identity.atlasKey)
        && this.scene.textures.get(identity.atlasKey).has(identity.frameName);
      const key = consumed ? this.config.stars.scar.key
        : identityReady ? identity.atlasKey : this.config.stars.anonymousKey;
      if (!this.scene.textures.exists(key)) continue;
      const id = star.key || star.id;
      let entry = previous.get(id);
      const sourcePoint = this.sourcePointForStar(star, snapshot);
      const point = this.view.sourceToWorld(sourcePoint);
      const frame = !consumed && identityReady ? identity.frameName : undefined;
      if (!entry) {
        const image = this.scene.add.image(point.x, point.y, key, frame)
          .setDepth(this.config.placement.depth + this.config.placement.layerStep * 5)
          .setInteractive({ useHandCursor: true });
        entry = { image, point, sourcePoint, light: null };
        image.on("pointerdown", () => this.inspect({ kind: "star", source: entry.star, world: entry.point }));
      } else {
        entry.image.setTexture(key, frame);
        this.scene.tweens?.killTweensOf?.(entry.sourcePoint);
        if (animate && !this.view.reducedMotion && this.scene.tweens) this.scene.tweens.add({
          targets: entry.sourcePoint, ...sourcePoint,
          duration: this.config.foliage.transitionMs, ease: "Sine.inOut" });
        else Object.assign(entry.sourcePoint, sourcePoint);
      }
      Object.assign(entry.point, this.view.sourceToWorld(entry.sourcePoint));
      previous.delete(id);
      Object.assign(entry, { star, consumed, identity: identityReady ? identity : null });
      const size = consumed ? this.config.stars.scarSizePx : this.config.stars.sizePx;
      entry.image.setDisplaySize(size, size).setPosition(entry.point.x, entry.point.y).setAlpha(1);
      // Preserve the exact authored five-point core and its own native light.
      entry.image.setBlendMode("NORMAL");
      const lightReady = this.config.stars.lightAlpha > 0 && !consumed && identityReady
        && this.scene.textures.exists(identity.lightAtlasKey)
        && this.scene.textures.get(identity.lightAtlasKey).has(identity.lightFrameName);
      if (lightReady && !entry.light) entry.light = this.scene.add.image(point.x, point.y,
        identity.lightAtlasKey, identity.lightFrameName).setBlendMode("SCREEN")
        .setDepth(this.config.placement.depth + this.config.placement.layerStep * 4);
      if (!lightReady) { entry.light?.destroy(); entry.light = null; }
      entry.light?.setDisplaySize(size * this.config.stars.lightSizeRatio, size * this.config.stars.lightSizeRatio);
      next.push(entry);
    }
    previous.forEach(entry => {
      this.scene.tweens?.killTweensOf?.(entry.sourcePoint);
      entry.image.destroy(); entry.light?.destroy();
    });
    this.entries = next;
  }

  update(time) {
    const config = this.config;
    this.entries.forEach((entry, index) => {
      Object.assign(entry.point, this.view.sourceToWorld(entry.sourcePoint));
      if (entry.consumed) { entry.image.setPosition(entry.point.x, entry.point.y); return; }
      const phase = time / config.stars.pulsePeriodMs * Math.PI * 2 + index * config.stars.phaseStep;
      entry.image.setAlpha(config.stars.minimumAlpha + (Math.sin(phase) + 1) / 2 * config.stars.pulseAlpha);
      const y = entry.point.y + (this.view.reducedMotion ? 0 : Math.sin(phase) * config.stars.bobPixels);
      entry.image.setPosition(entry.point.x, y);
      entry.light?.setPosition(entry.point.x, y).setAlpha(config.stars.lightAlpha)
        .setRotation(Math.sin(phase) * config.growth.vineSwayRadians);
    });
    for (const arrival of this.arrivals) {
      if (arrival.startedAt === null) arrival.startedAt = time;
      const t = Math.max(0, Math.min(1, (time - arrival.startedAt - arrival.delay)
        / config.motion.arrivalDurationMs));
      const eased = -(Math.cos(Math.PI * t) - 1) / 2;
      const target = this.view.sourceToWorld(arrival.sourceTarget);
      arrival.image.setPosition(arrival.start.x + (target.x - arrival.start.x) * eased,
        arrival.start.y + (target.y - arrival.start.y) * eased
          - Math.sin(t * Math.PI) * config.motion.arrivalArcPixels);
      if (t >= 1) { arrival.image.destroy(); this.arrivals.delete(arrival); }
    }
  }

  queueStarArrival(detail = {}) {
    if (!this.scene || this.arrivals.size >= this.config.motion.maximumArrivals) return false;
    const star = this.snapshot?.starMemories?.find(entry => entry.tile?.tx === detail.originTileX
      && entry.tile?.ty === detail.originTileY);
    const sourceTarget = this.sourcePointForStar(star);
    const tileSize = this.view.transform.tileSize;
    const start = Number.isFinite(detail.originTileX) && Number.isFinite(detail.originTileY)
      ? { x: (detail.originTileX + 0.5) * tileSize, y: (detail.originTileY + 0.5) * tileSize }
      : this.view.sourceToWorld({ x: this.config.source.hearthX, y: this.config.source.groundY });
    const identity = STAR_IDENTITY_LIBRARY_CONFIG.identities.find(entry => entry.id === (detail.identityId || star?.identityId));
    const ready = identity && this.scene.textures.exists(identity.atlasKey)
      && this.scene.textures.get(identity.atlasKey).has(identity.frameName);
    const image = this.scene.add.image(start.x, start.y,
      ready ? identity.atlasKey : this.config.stars.anonymousKey, ready ? identity.frameName : undefined)
      .setDisplaySize(this.config.stars.sizePx, this.config.stars.sizePx)
      .setDepth(this.config.placement.depth + this.config.placement.layerStep * 6);
    this.arrivals.add({ image, start, sourceTarget, startedAt: null,
      delay: this.arrivals.size * this.config.motion.arrivalStaggerMs });
    return true;
  }

  destroy() {
    this.entries.forEach(entry => {
      this.scene.tweens?.killTweensOf?.(entry.sourcePoint);
      entry.image.destroy(); entry.light?.destroy();
    });
    this.arrivals.forEach(entry => entry.image.destroy());
    for (const group of this.groups) this.scene?.runtimeFeatureAssetManager
      ?.releaseGroup(group, this.config.stars.consumer);
    this.groups.clear();
    this.entries = [];
    this.arrivals.clear();
    this.scene = null;
    this.snapshot = null;
  }
}

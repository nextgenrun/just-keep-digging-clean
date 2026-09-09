import { CAMPFIRE_CONFIG } from "../../values/campfireConfig.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { WORLDROOT_SANCTUARY_CONFIG, isWorldrootSanctuaryEnabled,
  resolveSanctuaryRegionPresentation, resolveSanctuaryTreeGrowth } from "../../values/worldrootSanctuary.js";
import { WorldrootSanctuaryStars } from "./WorldrootSanctuaryStars.js";
import { WorldrootSanctuaryGrowth } from "./WorldrootSanctuaryGrowth.js";

/** One decorative trunk, five clustered foliage/ruin regions and separate ground controls. */
export class WorldrootSanctuaryView {
  constructor(scene, config = WORLDROOT_SANCTUARY_CONFIG, inspect = () => false) {
    this.scene = scene;
    this.config = config;
    this.inspect = hotspot => this.canInspect() && inspect(hotspot);
    this.enabled = isWorldrootSanctuaryEnabled(globalThis.location?.search || "", config);
    this.entries = [];
    this.objects = [];
    this.objectEntries = [];
    this.treeScale = { width: 1, height: 1 };
    this.reducedMotion = globalThis.matchMedia?.(config.growth.reducedMotionMediaQuery)?.matches === true;
    this.snapshot = null;
    this.transform = null;
    this.signature = null;
  }

  create(snapshot) {
    if (!this.enabled) return this;
    const required = [this.config.base, ...this.config.regions.flatMap(region => [region.living, region.consumed])];
    if (required.some(asset => !this.scene.textures.exists(asset.key))) {
      this.enabled = false;
      return this;
    }
    const tileSize = this.scene.config?.tileSize || GAME_CONFIG.tileSize;
    const surfaceY = (this.scene.config?.topAirRows || GAME_CONFIG.topAirRows) * tileSize;
    const width = this.config.placement.widthTiles * tileSize;
    const scale = width / this.config.source.width;
    this.transform = { tileSize, surfaceY, width, height: this.config.source.height * scale,
      matureScale: scale, hearthX: (CAMPFIRE_CONFIG.surfaceTileX + 0.5) * tileSize,
      scaleX: scale, scaleY: scale,
      left: (CAMPFIRE_CONFIG.surfaceTileX + 0.5) * tileSize - this.config.source.hearthX * scale,
      top: surfaceY - this.config.source.groundY * scale };
    this.base = this.scene.add.image(this.transform.left, this.transform.top, this.config.base.key)
      .setOrigin(0, 0).setScale(scale).setDepth(this.config.placement.depth);
    Object.assign(this.treeScale, resolveSanctuaryTreeGrowth(snapshot, this.config));
    this._applyTransform();
    for (const region of this.config.regions) {
      const point = this.sourceToWorld(region);
      const size = region.size * scale;
      const make = (asset, layer, at = point, ratio = 1, flip = region.flip) =>
        this.scene.add.image(at.x, at.y, asset.key)
        .setDisplaySize(size * ratio, size * ratio).setFlipX(flip)
        .setDepth(this.config.placement.depth + layer * this.config.placement.layerStep);
      const livingCopies = this.config.foliage.copies.map((variant, index) => {
        const sourcePoint = { x: region.x + variant.offsetX * region.size,
          y: region.y + variant.offsetY * region.size };
        const copyPoint = this.sourceToWorld(sourcePoint);
        const image = make(region.living, 1 + index * 0.2, copyPoint, variant.scale,
          Boolean(region.flip) !== variant.mirror);
        return { image, sourcePoint, point: copyPoint, variant };
      });
      const living = livingCopies[0].image;
      const consumed = make(region.consumed, 2);
      const inspectRegion = () => {
        const source = this.snapshot?.profileMemories?.find(memory => memory.regionId === region.id
          && memory.knownCount > 0);
        if (source) this.inspect({ kind: "biome", source, world: point });
      };
      for (const image of [...livingCopies.map(copy => copy.image), consumed])
        image.setInteractive({ useHandCursor: true })
        .on("pointerdown", inspectRegion);
      this.entries.push({ region, living, livingCopies, consumed, size, point, presentation: null,
        livingAlpha: 0, livingScale: 0, scarAlpha: 0, scarScale: 0 });
    }
    this.talent = this._object(this.config.objects.talent, "root");
    this.crown = this._object(this.config.objects.crown, "crown", false);
    this.crownRoot = this._object({ ...this.config.objects.crown,
      ...this.config.objects.crownRoot }, "crown");
    this.archive = this._object(this.config.objects.archive, "titan");
    this.growth = new WorldrootSanctuaryGrowth(this.scene, this, this.config);
    this.stars = new WorldrootSanctuaryStars(this.scene, this, this.inspect, this.config);
    this.sync(snapshot, false);
    return this;
  }

  _object(spec, kind, grounded = true) {
    if (!this.scene.textures.exists(spec.key)) return null;
    const point = this.sourceToWorld(spec, grounded);
    const size = spec.size * (grounded ? this.transform.matureScale : this.transform.scaleX);
    const image = this.scene.add.image(point.x, point.y, spec.key).setDisplaySize(size, size)
      .setDepth(this.config.placement.depth + this.config.placement.layerStep * 4)
      .setBlendMode(kind === "titan" ? "SCREEN" : "NORMAL").setInteractive({ useHandCursor: true });
    image.on("pointerdown", () => {
      const source = kind === "titan" ? this._titanMemory() : {};
      if (source) this.inspect({ kind, source, world: point });
    });
    this.objects.push(image);
    this.objectEntries.push({ image, spec, point, grounded });
    return image;
  }

  _titanMemory() {
    return this.snapshot?.titanMemories?.find(memory => memory.tracked)
      || this.snapshot?.titanMemories?.find(memory => memory.discovered) || null;
  }

  sourceToWorld(point, grounded = false) {
    const scaleX = grounded ? this.transform.matureScale : this.transform.scaleX;
    const scaleY = grounded ? this.transform.matureScale : this.transform.scaleY;
    return { x: this.transform.hearthX + (point.x - this.config.source.hearthX) * scaleX,
      y: this.transform.surfaceY + (point.y - this.config.source.groundY) * scaleY };
  }

  _applyTransform() {
    const transform = this.transform;
    const source = this.config.source;
    transform.scaleX = transform.matureScale * this.treeScale.width;
    transform.scaleY = transform.matureScale * this.treeScale.height;
    transform.width = source.width * transform.scaleX;
    transform.height = source.height * transform.scaleY;
    transform.left = transform.hearthX - source.hearthX * transform.scaleX;
    transform.top = transform.surfaceY - source.groundY * transform.scaleY;
    this.base.setPosition(transform.left, transform.top).setDisplaySize(transform.width, transform.height);
    for (const entry of this.entries) {
      Object.assign(entry.point, this.sourceToWorld(entry.region));
      for (const copy of entry.livingCopies) {
        Object.assign(copy.point, this.sourceToWorld(copy.sourcePoint));
        const size = entry.region.size * transform.scaleX * entry.livingScale * copy.variant.scale;
        copy.image.setPosition(copy.point.x, copy.point.y).setAlpha(entry.livingAlpha)
          .setDisplaySize(size, size);
      }
      const scarSize = entry.region.size * transform.scaleX * entry.scarScale;
      entry.consumed.setPosition(entry.point.x, entry.point.y).setAlpha(entry.scarAlpha)
        .setDisplaySize(scarSize, scarSize);
    }
    for (const entry of this.objectEntries) {
      Object.assign(entry.point, this.sourceToWorld(entry.spec, entry.grounded));
      const size = entry.spec.size * (entry.grounded ? transform.matureScale : transform.scaleX);
      entry.image.setPosition(entry.point.x, entry.point.y).setDisplaySize(size, size);
    }
  }

  getTransform() { return this.transform; }
  getOneWayPlatforms() { return []; }

  getGroundHotspots() {
    return [["root", this.config.objects.talent], ["crown", this.config.objects.crownRoot]]
      .map(([kind, point], priority) => ({ kind, source: {}, world: this.sourceToWorld(point, true),
        priority, rangeX: this.config.interaction.rangeX, rangeY: this.config.interaction.rangeY }));
  }

  canInspect() {
    if (!this.scene || !this.transform || this.scene.gameState !== "playing") return false;
    const player = this.scene.playerController?.getPlayerTile?.();
    if (!player || this.scene._pillarViewActive || this.scene.campfireSystem?.isSelecting?.()) return false;
    const dx = Math.abs(player.tx - (CAMPFIRE_CONFIG.surfaceTileX + 0.5));
    const dy = Math.abs(player.ty - (this.transform.surfaceY / this.transform.tileSize - 1));
    return dx <= this.config.interaction.pointerReachTiles && dy <= this.config.interaction.pointerVerticalTiles;
  }

  sync(snapshot, animate = true) {
    if (!this.enabled || !this.transform || !snapshot) return;
    this.snapshot = snapshot;
    if (snapshot.signature !== this.signature) {
      this.signature = snapshot.signature;
      const treeScale = resolveSanctuaryTreeGrowth(snapshot, this.config);
      this.scene.tweens?.killTweensOf?.(this.treeScale);
      if (animate && !this.reducedMotion && this.scene.tweens) this.scene.tweens.add({
        targets: this.treeScale, ...treeScale, duration: this.config.treeGrowth.transitionMs, ease: "Sine.inOut" });
      else Object.assign(this.treeScale, treeScale);
      const health = Math.max(0, Math.min(1, (snapshot.consumedStarCount || 0)
        / Math.max(1, snapshot.knownStarCount || 0)));
      const color = [16, 8, 0].reduce((tint, shift) => {
        const alive = (this.config.placement.livingTint >> shift) & 255;
        const dead = (this.config.placement.consumedTint >> shift) & 255;
        return tint | Math.round(alive + (dead - alive) * health) << shift;
      }, 0);
      this.base.setTint(color);
      for (const entry of this.entries) {
        const memory = snapshot.regionMemories?.find(region => region.id === entry.region.id);
        const state = resolveSanctuaryRegionPresentation(memory, this.config);
        this.scene.tweens?.killTweensOf?.(entry);
        if (animate && !this.reducedMotion && this.scene.tweens) this.scene.tweens.add({
          targets: entry, livingAlpha: state.livingAlpha, livingScale: state.livingScale,
          scarAlpha: state.scarAlpha, scarScale: state.scarScale,
          duration: this.config.foliage.transitionMs, ease: "Sine.inOut" });
        else Object.assign(entry, state);
        entry.presentation = state;
      }
    }
    this._applyTransform();
    this.archive?.setVisible(Boolean(this._titanMemory()));
    this.growth?.sync(snapshot, animate);
    this.stars?.sync(snapshot, animate);
  }

  update(time) {
    if (!this.enabled) return;
    this._applyTransform();
    const pulse = (Math.sin(time / this.config.motion.crownPulsePeriodMs * Math.PI * 2) + 1) / 2;
    const alpha = (this.snapshot?.endgameReady ? this.config.motion.crownReadyAlpha
      : this.config.motion.crownDormantAlpha) + pulse * this.config.motion.crownPulseAlpha;
    this.crown?.setAlpha(alpha);
    this.crownRoot?.setAlpha(alpha);
    const talents = this.snapshot?.talentMemories || [];
    const talentProgress = talents.reduce((total, memory) => total
      + Math.max(0, Math.min(1, Number(memory.progress) || 0)), 0) / Math.max(1, talents.length);
    this.talent?.setAlpha(this.config.motion.talentBaseAlpha
      + talentProgress * this.config.motion.talentProgressAlpha
      + (this.snapshot?.gpRatio || 0) * pulse * this.config.motion.gpPulseAlpha);
    const titanProgress = Math.min(1, (this.snapshot?.titanCount || 0)
      / Math.max(1, this.snapshot?.titanMemories?.length || 0));
    this.archive?.setAlpha(this.config.motion.titanBaseAlpha
      + titanProgress * this.config.motion.titanProgressAlpha
      + (this._titanMemory()?.tracked ? pulse * this.config.motion.titanTrackedPulseAlpha : 0));
    this.stars?.update(time);
    this.growth?.update(time);
  }

  queueStarArrival(detail) { return this.stars?.queueStarArrival(detail) === true; }

  getDebugSnapshot() {
    return { kind: "root-sanctuary", platformCount: 0,
      regionCount: this.entries.length, starCount: this.stars?.entries.length || 0,
      livingBushes: this.entries.reduce((total, entry) => total + entry.livingCopies.length, 0),
      liveStars: this.stars?.entries.filter(entry => !entry.consumed).length || 0,
      identityStars: this.stars?.entries.filter(entry => !entry.consumed
        && entry.image.texture?.key !== this.config.stars.anonymousKey).length || 0,
      scars: this.stars?.entries.filter(entry => entry.consumed).length || 0,
      regions: this.entries.map(entry => ({ id: entry.region.id, ...entry.presentation })),
      treeScale: { ...this.treeScale },
      treeBounds: { x: this.transform.left, y: this.transform.top,
        width: this.transform.width, height: this.transform.height },
      extraStarLights: this.stars?.entries.filter(entry => entry.light).length || 0,
      hearth: this.sourceToWorld({ x: this.config.source.hearthX, y: this.config.source.groundY }),
      groundHotspots: this.getGroundHotspots().map(entry => ({ kind: entry.kind, ...entry.world })),
      growth: this.growth?.getDebugSnapshot(),
      separateCampfire: true, bakedStars: false };
  }

  destroy() {
    this.stars?.destroy();
    this.growth?.destroy();
    this.base?.destroy();
    this.scene?.tweens?.killTweensOf?.(this.treeScale);
    for (const entry of this.entries) {
      this.scene?.tweens?.killTweensOf?.(entry);
      entry.livingCopies.forEach(copy => copy.image.destroy());
      entry.consumed.destroy();
    }
    this.objects.forEach(image => image.destroy());
    this.entries = [];
    this.objects = [];
    this.objectEntries = [];
    this.scene = null;
    this.snapshot = null;
  }
}

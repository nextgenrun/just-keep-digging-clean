import { WorldVisualLevelOneAmbientEvents } from "./WorldVisualLevelOneAmbientEvents.js";
import { LEVEL_TWO_SCENIC_MOTION } from "../../../values/levelTwoScenicMotion.js";
import { WorldVisualLayeredLandmarks } from "./WorldVisualLayeredLandmarks.js";
import { compositeGeneratedMatte } from "./compositeGeneratedMatte.js";
import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";
import { WorldVisualLayeredFloatingDetails } from "./WorldVisualLayeredFloatingDetails.js";
import { WorldVisualLayeredCloudField } from "./WorldVisualLayeredCloudField.js";
import { WorldVisualLayeredLandscapeField } from "./WorldVisualLayeredLandscapeField.js";
import { sampleLayeredEnvironment, WorldVisualLayeredSkyGradient } from "./WorldVisualLayeredEnvironment.js";

// Approved Level 1 backdrop owner; the historical class name keeps review tools compatible.
export class WorldVisualLayeredSkyReview {
  constructor(scene) {
    this.scene = scene;
    this.cards = new Map();
    this.ownedTextureKeys = new Set();
    this.lastTime = null;
    this.paused = new URLSearchParams(globalThis.location?.search || "").get(CONFIG.motionQueryParam) === "0";
    this.clouds = new WorldVisualLayeredCloudField(scene);
    this.landscape = new WorldVisualLayeredLandscapeField(scene, this);
    this.details = new WorldVisualLayeredFloatingDetails(scene);
    this.ambientEvents = new WorldVisualLevelOneAmbientEvents(scene);
    this.gradient = new WorldVisualLayeredSkyGradient(scene);
    this.landmarks = LEVEL_TWO_SCENIC_MOTION.assets.every(asset=>scene.textures.exists(asset.key))
      ? new WorldVisualLayeredLandmarks(scene,this) : null;
    this.inspector = Object.freeze({ snapshot: () => this.snapshot(),
      setPaused: value => { this.paused = Boolean(value); } });
    globalThis.__jkdLayeredSkyReview = this.inspector;
  }

  featherTexture(sourceKey, horizontalPx, verticalPx = 0, trailingEdge = false) {
    const key = sourceKey + ":edge:" + horizontalPx + ":" + verticalPx + ":" + trailingEdge;
    if (this.scene.textures.exists(key)) return key;
    const source = this.scene.textures.get(sourceKey).getSourceImage();
    const texture = this.scene.textures.createCanvas(key, source.width, source.height);
    const ctx = texture.getContext();
    ctx.drawImage(source, 0, 0);
    if([...CONFIG.ridges,...LEVEL_TWO_SCENIC_MOTION.assets].some(asset=>asset.key===sourceKey))compositeGeneratedMatte(ctx,source.width,source.height);
    ctx.globalCompositeOperation = "destination-in";
    for (const [x, y] of [[horizontalPx, 0], [0, verticalPx]]) {
      if (!x && !y) continue;
      const both = trailingEdge && x > 0;
      const gradient = ctx.createLinearGradient(0, 0, both ? source.width : x, y);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      if (both) {
        const fraction = x / source.width;
        gradient.addColorStop(fraction, "rgba(255,255,255,1)");
        gradient.addColorStop(1 - fraction, "rgba(255,255,255,1)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
      } else gradient.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, source.width, source.height);
    }
    ctx.globalCompositeOperation = "source-over";
    texture.refresh();
    this.ownedTextureKeys.add(key);
    return key;
  }

  update(time, lighting) {
    const delta = this.lastTime === null ? 0 : Math.max(0, Math.min(CONFIG.maxDeltaMs, time - this.lastTime));
    this.lastTime = time;
    const camera = this.scene.cameras.main;
    const visible = camera.worldView.y < this.scene.config.topAirRows * this.scene.config.tileSize + CONFIG.visibilityBelowSurfacePx;
    this.environment = sampleLayeredEnvironment(this.scene, lighting);
    const atmosphere = { ...lighting, environment: this.environment };
    this.gradient.update(camera, this.environment, visible);
    this.syncSky(camera, atmosphere, visible);
    this.clouds.update(this.paused ? 0 : delta / 1000, atmosphere, visible);
    this.landscape.update(camera, atmosphere, visible);
    this.details.update(this.clouds, this.environment, visible);
    this.ambientEvents.update(this.clouds, this.environment, visible);
    this.landmarks?.update(camera,this.environment,this.clouds.traveledSeconds,visible);
  }

  syncSky(camera, lighting, visible) {
    const cfg = CONFIG.skyField;
    const view = camera.worldView;
    const source = this.scene.textures.get(CONFIG.sky.key).getSourceImage();
    const width = source.width, height = source.height;
    const strideX = width - cfg.overlapX, strideY = height - cfg.overlapY;
    const left = view.x - camera.scrollX * (1 - cfg.parallaxX);
    const top = view.y - camera.scrollY * (1 - cfg.parallaxY);
    const desired = new Set();
    if (visible) for (let row = Math.floor((top - height) / strideY); row <= Math.floor((top + view.height) / strideY); row++) {
      for (let col = Math.floor((left - width) / strideX); col <= Math.floor((left + view.width) / strideX); col++) {
        const id = row + ":" + col;
        desired.add(id);
        let image = this.cards.get(id);
        if (!image) {
          const key = this.featherTexture(CONFIG.sky.key, cfg.overlapX, cfg.overlapY);
          image = this.scene.add.image(col * strideX, row * strideY, key).setOrigin(0)
            .setScrollFactor(cfg.parallaxX, cfg.parallaxY)
            .setDepth(cfg.depth + row * cfg.rowDepthStep + col * cfg.columnDepthStep);
          image.name = "regenerated-sky:" + id;
          this.cards.set(id, image);
        }
        image.setTint(lighting.farTint).setAlpha(lighting.environment.stars);
      }
    }
    for (const [id, image] of this.cards) {
      if (desired.has(id)) continue;
      image.destroy(); this.cards.delete(id);
    }
  }

  snapshot() {
    return { reviewOnly: Boolean(this.landmarks), release: CONFIG.release, generation: CONFIG.generation, ready: true, paused: this.paused,
      skyCards: this.cards.size, landscapeCards: this.landscape.cards.size,
      cloudSprites: this.clouds.active.size, pooledCloudSprites: this.clouds.pool.length,
      layers: CONFIG.cloudLayers.map(layer => ({id:layer.id,parallaxX:layer.parallaxX,speed:layer.speed})),
      traveledSeconds: this.clouds.traveledSeconds, windDistance: this.clouds.windDistance, wind: this.clouds.wind,
      ambientEvents: this.ambientEvents.snapshot(), floatingDetails: this.details.snapshot(), celestial: this.scene.dayNightCycle?.layeredCelestial?.snapshot(),
      environment: this.environment, landmarks:this.landmarks?.snapshot()||[], blendedHeavenblocks: 0,
      backgroundAssets: [CONFIG.sky, ...CONFIG.ridges, CONFIG.forestAsset, CONFIG.cloudAtlas, CONFIG.cumulusAtlas, CONFIG.cloudBankAtlas, CONFIG.celestialAtlas, CONFIG.weatherAtlas,...(this.landmarks?LEVEL_TWO_SCENIC_MOTION.assets:[])].map(asset=>asset.key) };
  }

  destroy() {
    for (const image of this.cards.values()) image.destroy();
    this.cards.clear();
    this.landmarks?.destroy();
    this.gradient.destroy();
    this.landscape.destroy();
    this.clouds.destroy();
    this.details.destroy();
    this.ambientEvents.destroy();
    for (const key of this.ownedTextureKeys) this.scene.textures.remove(key);
    this.ownedTextureKeys.clear();
    if (globalThis.__jkdLayeredSkyReview === this.inspector) delete globalThis.__jkdLayeredSkyReview;
  }
}

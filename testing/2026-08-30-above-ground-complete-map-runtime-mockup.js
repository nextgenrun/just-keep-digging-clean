import { ASSET_KEYS } from "../values/assetKeys.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST } from
  "../values/v11PolishedSurfaceRuntimeManifest.js";
import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import { getWorldVisualPreloadAssets } from "../values/worldVisualRuntime.js";
import { resolveWorldVisualDepthBackdropBlendMask, WORLD_VISUAL_DEPTH_BACKDROPS } from
  "../values/worldVisualDepthBackdrops.js";
import { WORLD_VISUAL_PROP_ATLASES_V3 } from
  "../values/generated/worldVisualPropLibraryV3/index.js";
import { WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS } from
  "../values/worldVisualSurfaceHeroLandmarks.js";
import { WorldBackgroundMasterSystem } from
  "../world/rendering/WorldBackgroundMasterSystem.js";
import { WorldVisualSkyCohesionLayer } from
  "../world/rendering/scenic-world/WorldVisualSkyCohesionLayer.js";
import { WorldVisualSurfaceStage } from
  "../world/rendering/scenic-world/WorldVisualSurfaceStage.js";
import {
  COMPLETE_MAP_PROP_COUNTS,
  createCompleteMapPropSprites,
} from "./2026-08-30-above-ground-complete-map-library-renderer.js";
import { configureCompleteMapHud, snapshotCompleteMapCamera } from
  "./2026-08-30-above-ground-complete-map-hud.js";
import { createCompleteMapBackgroundConfigs } from
  "./2026-08-30-above-ground-complete-map-background-config.js";

const params = new URLSearchParams(globalThis.location.search);
const clean = params.get("clean") === "1";
const EMPTY_DEPTH_MANIFEST = Object.freeze({ objects: Object.freeze([]) });
const LIGHTING = Object.freeze({ terrainTint: 0xffffff, farTint: 0xffffff, wet: 0, lightning: 0 });
const BACKGROUND_CONFIGS = createCompleteMapBackgroundConfigs(REVIEW);
class AboveGroundCompleteMapScene extends Phaser.Scene {
  constructor() {
    super("AboveGroundCompleteMapScene");
    this.config = {
      tileSize: REVIEW.tileSize,
      topAirRows: REVIEW.surfaceTileY,
      worldWidthTiles: 280,
      worldWidthPx: 280 * REVIEW.tileSize,
    };
    this.sprites = [];
    this.seenBackgroundIds = new Set();
    this.seenSkyAssetKeys = new Set();
    this.seenPropIds = new Set();
    this.drag = null;
    this.ready = false;
    this.chapterIndex = Math.max(
      0,
      REVIEW.chapters.findIndex(item => item.id === REVIEW.defaultChapterId),
    );
    this.bandId = REVIEW.defaultBandId;
  }
  preload() {
    this.load.setBaseURL("../");
    const surfaceAssets = getWorldVisualPreloadAssets(
      BACKGROUND_CONFIGS.surface,
      "?surfaceMotion=town-air",
    );
    for (const asset of surfaceAssets) {
      if (asset.type === "video") this.load.video(asset.key, asset.path, true);
      else this.load.image(asset.key, asset.path);
    }
    const blendMask = resolveWorldVisualDepthBackdropBlendMask(
      WORLD_VISUAL_DEPTH_BACKDROPS,
      "?surfaceMotion=town-air",
    );
    this.load.image(blendMask.key, blendMask.path);
    for (const atlas of WORLD_VISUAL_PROP_ATLASES_V3) {
      this.load.atlas(atlas.key, atlas.path, atlas.dataPath);
    }
    for (const definitions of Object.values(ASSET_KEYS.environment.surfaceProps)) {
      for (const asset of Object.values(definitions)) this.load.image(asset.key, asset.path);
    }
    for (const asset of Object.values(WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS)) {
      this.load.image(asset.key, asset.path);
    }
  }
  create() {
    if (clean) document.body.classList.add("clean");
    const map = REVIEW.map;
    this.cameras.main
      .setBackgroundColor(REVIEW.backgroundColor)
      .setBounds(
        map.leftTile * REVIEW.tileSize,
        map.topTile * REVIEW.tileSize,
        (map.rightTileExclusive - map.leftTile) * REVIEW.tileSize,
        (map.bottomTileExclusive - map.topTile) * REVIEW.tileSize,
      )
      .setZoom(REVIEW.camera.defaultZoom);
    const requestedChapter = params.get("chapter") || REVIEW.defaultChapterId;
    const requestedBand = params.get("band") || REVIEW.defaultBandId;
    const requestedTile = params.get("tile");
    const tile = requestedTile === null ? Number.NaN : Number(requestedTile);
    this.jumpTo(requestedChapter, requestedBand);
    if (Number.isFinite(tile)) this.centerCamera(tile, this.currentBand().centerTileY);
    this.cameras.main.preRender();

    this.background = new WorldBackgroundMasterSystem(
      this,
      REVIEW.background,
      V11_POLISHED_SURFACE_RUNTIME_MANIFEST,
      EMPTY_DEPTH_MANIFEST,
    );
    this.background.create();
    this.sky = new WorldVisualSkyCohesionLayer(
      this,
      BACKGROUND_CONFIGS.sky,
      "?skyComposition=ordered",
    );
    this.sky.create();
    this.surface = new WorldVisualSurfaceStage(this, BACKGROUND_CONFIGS.surface);
    this.surface.create();
    if (REVIEW.skyCohesionOwnsIslandBackdrop) this.surface.far
      .filter(image => image.name.includes("sky-island-far"))
      .forEach(image => image.setVisible(false));

    this.sprites = createCompleteMapPropSprites(this, REVIEW);
    this.configureInput();
    configureCompleteMapHud(this, REVIEW);

    this.jumpTo(requestedChapter, requestedBand);
    if (Number.isFinite(tile)) this.centerCamera(tile, this.currentBand().centerTileY);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.background?.destroy();
      this.sky?.destroy();
      this.surface?.destroy();
    });
  }

  configureInput() {
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.input.keyboard.on("keydown-Q", () => this.stepChapter(-1));
    this.input.keyboard.on("keydown-E", () => this.stepChapter(1));
    REVIEW.bands.forEach((band, index) => {
      this.input.keyboard.on(`keydown-${index + 1}`, () => this.jumpToBand(band.id));
    });
    this.input.on("pointerdown", pointer => {
      this.drag = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY };
    });
    this.input.on("pointerup", () => { this.drag = null; });
    this.input.on("pointermove", pointer => {
      if (!this.drag || !pointer.isDown) return;
      const camera = this.cameras.main;
      camera.scrollX = this.drag.scrollX - (pointer.x - this.drag.x) / camera.zoom;
      camera.scrollY = this.drag.scrollY - (pointer.y - this.drag.y) / camera.zoom;
    });
    this.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      const next = Phaser.Math.Clamp(
        this.cameras.main.zoom - dy * REVIEW.camera.wheelZoomStep,
        REVIEW.camera.minimumZoom,
        REVIEW.camera.maximumZoom,
      );
      this.cameras.main.setZoom(next);
    });
  }

  currentBand() {
    return REVIEW.bands.find(item => item.id === this.bandId) || REVIEW.bands.at(-1);
  }

  jumpTo(chapterId, bandId) {
    this.chapterIndex = Math.max(0, REVIEW.chapters.findIndex(item => item.id === chapterId));
    this.bandId = REVIEW.bands.some(item => item.id === bandId) ? bandId : REVIEW.defaultBandId;
    this.centerCamera(REVIEW.chapters[this.chapterIndex].tileX, this.currentBand().centerTileY);
    this.refreshHud();
  }

  jumpToChapter(id) {
    const index = REVIEW.chapters.findIndex(item => item.id === id);
    if (index >= 0) this.chapterIndex = index;
    this.centerCamera(REVIEW.chapters[this.chapterIndex].tileX, this.currentBand().centerTileY);
    this.refreshHud();
  }

  jumpToBand(id) {
    if (REVIEW.bands.some(item => item.id === id)) this.bandId = id;
    const centerTileX = (this.cameras.main.worldView.centerX || 0) / REVIEW.tileSize;
    this.centerCamera(centerTileX, this.currentBand().centerTileY);
    this.refreshHud();
  }

  stepChapter(delta) {
    this.chapterIndex = Phaser.Math.Wrap(this.chapterIndex + delta, 0, REVIEW.chapters.length);
    this.jumpToChapter(REVIEW.chapters[this.chapterIndex].id);
  }

  centerCamera(tileX, tileY) {
    this.cameras.main.centerOn(tileX * REVIEW.tileSize, tileY * REVIEW.tileSize);
  }

  refreshHud() {
    const chapter = REVIEW.chapters[this.chapterIndex];
    const band = this.currentBand();
    document.querySelector("#chapter-label").textContent = `${chapter.label} · ${band.label}`;
    document.querySelector("#chapter-select").value = chapter.id;
    document.querySelector("#band-select").value = band.id;
  }

  update(_time, delta) {
    const camera = this.cameras.main;
    const speed = REVIEW.camera.panSpeedTilesPerSecond * REVIEW.tileSize * delta / 1000 / camera.zoom;
    const horizontal = (this.keys.A.isDown || this.keys.LEFT.isDown ? -1 : 0)
      + (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0);
    const vertical = (this.keys.W.isDown || this.keys.UP.isDown ? -1 : 0)
      + (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0);
    camera.scrollX += horizontal * speed;
    camera.scrollY += vertical * speed;
    this.background.update();
    const view = camera.worldView;
    const skySignature = [view.left, view.right, view.top, view.bottom]
      .map(value => Math.floor(value / REVIEW.tileSize)).join(":");
    if (skySignature !== this.lastSkySignature) {
      this.lastSkySignature = skySignature;
      this.sky.sync({
        left: view.left / REVIEW.tileSize,
        right: view.right / REVIEW.tileSize,
        top: view.top / REVIEW.tileSize,
        bottom: view.bottom / REVIEW.tileSize,
      }, LIGHTING);
    }
    this.sky.update(this.time.now, LIGHTING);
    this.surface.update(this.time.now, LIGHTING);
    for (const id of this.background.textureStream.images.keys()) this.seenBackgroundIds.add(id);
    for (const card of this.sky.cards.values()) this.seenSkyAssetKeys.add(card.cell.asset.key);
    this.updateSpriteVisibility();
    if (!this.lastDatasetUpdate || this.time.now - this.lastDatasetUpdate >= 250) {
      this.lastDatasetUpdate = this.time.now;
      document.body.dataset.runtimeSnapshot = JSON.stringify(this.snapshot());
      document.body.dataset.activeBackgroundIds = [
        ...this.background.textureStream.images.keys(),
      ].join(",");
    }
    const sky = this.sky.getSnapshot();
    if (!this.ready && this.surface.surfacePack?.getMotionSnapshot()?.ready
      && sky.foundationReady && sky.activeFeatureCards > 0) {
      this.ready = true;
      document.body.classList.add("ready");
      document.body.dataset.aboveGroundCompleteMapReady = "true";
      document.body.dataset.townVideoChanged = "false";
    }
  }

  updateSpriteVisibility() {
    const view = this.cameras.main.worldView;
    const margin = REVIEW.tileSize * 2;
    for (const sprite of this.sprites) {
      const bounds = sprite._reviewBounds;
      const visible = bounds.right > view.left - margin && bounds.left < view.right + margin
        && bounds.bottom > view.top - margin && bounds.top < view.bottom + margin;
      sprite.setVisible(visible);
      if (visible) this.seenPropIds.add(sprite.name);
    }
  }

  snapshot() {
    const background = this.background.getPerformanceSnapshot();
    const sky = this.sky.getSnapshot();
    return {
      ready: this.ready,
      reviewOnly: REVIEW.reviewOnly,
      productionChanged: REVIEW.productionChanged,
      chapterId: REVIEW.chapters[this.chapterIndex].id,
      bandId: this.bandId,
      backgroundManifestObjects: V11_POLISHED_SURFACE_RUNTIME_MANIFEST.objects.length,
      backgroundRuntimeObjects: background.activeObjects,
      backgroundActiveImages: background.activeImages,
      backgroundFailedTextures: this.background.textureStream.failedTextures.size,
      backgroundSeenDuringReview: this.seenBackgroundIds.size,
      skyLibraryAssets: Object.keys(BACKGROUND_CONFIGS.sky.assets).length,
      skyActiveFeatureCards: sky.activeFeatureCards,
      skyPendingFeatureAssets: sky.pendingFeatureAssets,
      skyCoverageReady: sky.coverageReady,
      skySeenDuringReview: this.seenSkyAssetKeys.size,
      generatedSurfaceProps: COMPLETE_MAP_PROP_COUNTS.generatedSurface,
      generatedSkyProps: COMPLETE_MAP_PROP_COUNTS.generatedSky,
      retainedProps: COMPLETE_MAP_PROP_COUNTS.retained,
      heroLandmarks: COMPLETE_MAP_PROP_COUNTS.heroes,
      totalPropObjects: this.sprites.length,
      visiblePropObjects: this.sprites.filter(sprite => sprite.visible).length,
      propsSeenDuringReview: this.seenPropIds.size,
      missingPropIds: this.sprites.filter(sprite => !this.seenPropIds.has(sprite.name)).map(sprite => sprite.name),
      camera: snapshotCompleteMapCamera(this.cameras.main),
      townMotion: this.surface.surfacePack?.getMotionSnapshot() || null,
      townVideoChanged: false,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
    };
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: REVIEW.width,
  height: REVIEW.height,
  parent: "map",
  backgroundColor: REVIEW.backgroundColor,
  render: { antialias: true, roundPixels: false },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [AboveGroundCompleteMapScene],
});

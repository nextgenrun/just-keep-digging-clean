import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import { WORLD_VISUAL_ABOVE_GROUND_LIVING_RUNTIME_REVIEW as LIVING_REVIEW } from
  "../values/worldVisualAboveGroundLivingRuntimeReview.js";
import { createCompleteMapBackgroundConfigs } from
  "./2026-08-30-above-ground-complete-map-background-config.js";
import {
  configureAboveGroundLivingHud,
  refreshAboveGroundLivingHud,
} from "./2026-08-30-above-ground-living-runtime-hud.js";
import {
  AboveGroundLivingRuntimeSystems,
  preloadAboveGroundLivingAssets,
} from "./2026-08-30-above-ground-living-runtime-systems.js";

const params = new URLSearchParams(globalThis.location.search);
const BACKGROUND_CONFIGS = createCompleteMapBackgroundConfigs(REVIEW);

class AboveGroundLivingRuntimeScene extends Phaser.Scene {
  constructor() {
    super("AboveGroundLivingRuntimeScene");
    this.config = {
      tileSize: REVIEW.tileSize,
      topAirRows: REVIEW.surfaceTileY,
      worldWidthTiles: 280,
      worldWidthPx: 280 * REVIEW.tileSize,
      worldDepthTiles: REVIEW.map.bottomTileExclusive,
      viewportWidth: REVIEW.width,
      viewportHeight: REVIEW.height,
      spawnTileX: 28,
    };
    this.chapterIndex = Math.max(
      0,
      REVIEW.chapters.findIndex(item => item.id === REVIEW.defaultChapterId),
    );
    this.bandId = REVIEW.defaultBandId;
    this.motionEnabled = LIVING_REVIEW.runtime.defaultMotionEnabled;
    this.drag = null;
    this.ready = false;
    this.lastSyncSignature = "";
  }

  preload() {
    preloadAboveGroundLivingAssets(this, BACKGROUND_CONFIGS.surface);
  }

  create() {
    const mapWidth = 280 * REVIEW.tileSize;
    const mapHeight = REVIEW.map.bottomTileExclusive * REVIEW.tileSize;
    this.cameras.main
      .setBackgroundColor(REVIEW.backgroundColor)
      .setBounds(0, 0, mapWidth, mapHeight)
      .setZoom(REVIEW.camera.defaultZoom);
    this.runtime = new AboveGroundLivingRuntimeSystems(
      this,
      REVIEW,
      LIVING_REVIEW,
      BACKGROUND_CONFIGS,
    );
    this.runtime.create();
    this.configureInput();
    configureAboveGroundLivingHud(this, REVIEW, LIVING_REVIEW);

    const requestedChapter = params.get("chapter") || REVIEW.defaultChapterId;
    const requestedBand = params.get("band") || REVIEW.defaultBandId;
    this.jumpTo(requestedChapter, requestedBand);
    const weather = params.get("weather") || LIVING_REVIEW.initialWeatherId;
    this.setWeather(weather);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.runtime?.destroy());
  }

  configureInput() {
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT");
    this.input.keyboard.on("keydown-Q", () => this.stepChapter(-1));
    this.input.keyboard.on("keydown-E", () => this.stepChapter(1));
    REVIEW.bands.forEach((band, index) => {
      this.input.keyboard.on(`keydown-${index + 1}`, () => this.jumpToBand(band.id));
    });
    this.input.on("pointerdown", pointer => {
      this.drag = {
        x: pointer.x,
        y: pointer.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      };
    });
    this.input.on("pointerup", () => { this.drag = null; });
    this.input.on("pointermove", pointer => {
      if (!this.drag || !pointer.isDown) return;
      const camera = this.cameras.main;
      camera.scrollX = this.drag.scrollX - (pointer.x - this.drag.x) / camera.zoom;
      camera.scrollY = this.drag.scrollY - (pointer.y - this.drag.y) / camera.zoom;
    });
    this.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      const camera = this.cameras.main;
      camera.setZoom(Phaser.Math.Clamp(
        camera.zoom - dy * REVIEW.camera.wheelZoomStep,
        REVIEW.camera.minimumZoom,
        REVIEW.camera.maximumZoom,
      ));
      this.syncWorld(true);
    });
  }

  currentChapter() {
    return REVIEW.chapters[this.chapterIndex];
  }

  currentBand() {
    return REVIEW.bands.find(item => item.id === this.bandId) || REVIEW.bands.at(-1);
  }

  jumpTo(chapterId, bandId) {
    const chapterIndex = REVIEW.chapters.findIndex(item => item.id === chapterId);
    if (chapterIndex >= 0) this.chapterIndex = chapterIndex;
    if (REVIEW.bands.some(item => item.id === bandId)) this.bandId = bandId;
    this.centerCamera(this.currentChapter().tileX, this.currentBand().centerTileY);
    this.syncWorld(true);
    this.refreshHud();
  }

  jumpToChapter(id) {
    this.jumpTo(id, this.bandId);
  }

  jumpToBand(id) {
    this.jumpTo(this.currentChapter().id, id);
  }

  stepChapter(delta) {
    this.chapterIndex = Phaser.Math.Wrap(
      this.chapterIndex + delta,
      0,
      REVIEW.chapters.length,
    );
    this.jumpToChapter(this.currentChapter().id);
  }

  centerCamera(tileX, tileY) {
    this.cameras.main.centerOn(tileX * REVIEW.tileSize, tileY * REVIEW.tileSize);
    this.cameras.main.preRender();
  }

  setWeather(id) {
    const selected = this.runtime.setWeather(id);
    const url = new URL(globalThis.location.href);
    url.searchParams.set("weather", selected);
    history.replaceState(null, "", url);
    this.refreshHud();
  }

  setMotion(enabled) {
    this.motionEnabled = Boolean(enabled);
    this.runtime.setMotion(this.motionEnabled);
    this.refreshHud();
  }

  toggleMotion() {
    this.setMotion(!this.motionEnabled);
  }

  syncWorld(force = false) {
    if (!this.runtime) return;
    const view = this.cameras.main.worldView;
    const snap = LIVING_REVIEW.runtime.syncSnapTiles * REVIEW.tileSize;
    const signature = [view.left, view.right, view.top, view.bottom]
      .map(value => Math.floor(value / snap)).join(":");
    if (!force && signature === this.lastSyncSignature) return;
    this.lastSyncSignature = signature;
    this.runtime.sync(force);
  }

  update(time, delta) {
    const camera = this.cameras.main;
    const speed = REVIEW.camera.panSpeedTilesPerSecond * REVIEW.tileSize
      * delta / 1000 / camera.zoom;
    const horizontal = (this.keys.A.isDown || this.keys.LEFT.isDown ? -1 : 0)
      + (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0);
    const vertical = (this.keys.W.isDown || this.keys.UP.isDown ? -1 : 0)
      + (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0);
    camera.scrollX += horizontal * speed;
    camera.scrollY += vertical * speed;
    this.syncWorld(false);
    this.runtime.update(time, delta, this.motionEnabled);

    if (!this.ready && this.runtime.isReady()) {
      this.ready = true;
      document.body.classList.add("ready");
      document.body.dataset.aboveGroundLivingRuntimeReady = "true";
      document.body.dataset.townVideoChanged = "false";
    }
    if (!this.lastDatasetUpdate || time - this.lastDatasetUpdate >= LIVING_REVIEW.runtime.hudRefreshMs) {
      this.lastDatasetUpdate = time;
      const snapshot = this.snapshot();
      document.body.dataset.runtimeSnapshot = JSON.stringify(snapshot);
      refreshAboveGroundLivingHud(this, snapshot);
    }
  }

  refreshHud() {
    if (!this.runtime) return;
    refreshAboveGroundLivingHud(this, this.snapshot());
  }

  snapshot() {
    const runtime = this.runtime.snapshot();
    return {
      ...runtime,
      ready: this.ready || runtime.ready,
      reviewOnly: LIVING_REVIEW.reviewOnly,
      productionChanged: LIVING_REVIEW.productionChanged,
      chapterId: this.currentChapter().id,
      bandId: this.bandId,
      motionEnabled: this.motionEnabled,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
      fps: this.game.loop.actualFps || 0,
      townVideoChanged: false,
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
  scene: [AboveGroundLivingRuntimeScene],
});

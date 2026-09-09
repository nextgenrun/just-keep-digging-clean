import { WORLD_VISUAL_GROUND_LEVEL_RUNTIME_REVIEW as REVIEW } from "../../../values/worldVisualGroundLevelRuntimeReview.js";
import {
  getGroundBackgroundPreloadAssets,
  WORLD_VISUAL_GROUND_BACKGROUND_MOTION_REVIEW as BACKGROUNDS,
} from "../../../values/worldVisualGroundBackgroundMotionReview.js";
import { getWorldVisualPreloadAssets } from "../../../values/worldVisualRuntime.js";
import { resolveWorldVisualDepthBackdropBlendMask, WORLD_VISUAL_DEPTH_BACKDROPS } from "../../../values/worldVisualDepthBackdrops.js";
import { WorldVisualSurfaceStage } from "../../../world/rendering/scenic-world/WorldVisualSurfaceStage.js";
import { GroundLevelBackgroundField } from "./GroundLevelBackgroundField.js";
import { GroundLevelChronology } from "./GroundLevelChronology.js";
import { GroundLevelHud } from "./GroundLevelHud.js";
import { GroundLevelMotionField } from "./GroundLevelMotionField.js";
import { GROUND_LEVEL_SURFACE_CONFIG } from "./GroundLevelSurfaceConfig.js";

const params = new URLSearchParams(globalThis.location.search);
const requestedMotion = Phaser.Math.Clamp(Number(params.get("motion") || 100), 0, 150);
const initial = Object.freeze({
  chapterId: params.get("chapter") || REVIEW.defaultChapterId,
  day: Number(params.get("day") || REVIEW.chronology.defaultDay),
  hour: Number(params.get("hour") || REVIEW.chronology.defaultHour),
  weather: params.get("weather") || "clear",
  motionPercent: requestedMotion,
});

class GroundLevelWorldScene extends Phaser.Scene {
  constructor() {
    super("GroundLevelWorldScene");
    this.config = {
      tileSize: REVIEW.tileSize,
      topAirRows: REVIEW.surfaceTileY,
      worldWidthTiles: REVIEW.worldWidthTiles,
      worldWidthPx: REVIEW.worldWidthTiles * REVIEW.tileSize,
    };
    this.chapterIndex = Math.max(0, REVIEW.chapters.findIndex(item => item.id === initial.chapterId));
    this.drag = null;
    this.ready = false;
    this.failedAssets = 0;
  }

  preload() {
    this.load.setBaseURL("../../../");
    for (const asset of getGroundBackgroundPreloadAssets()) this.load.image(asset.key, asset.path);
    for (const asset of getWorldVisualPreloadAssets(GROUND_LEVEL_SURFACE_CONFIG, "?surfaceMotion=town-air")) {
      if (asset.type === "video") this.load.video(asset.key, asset.path, true);
      else this.load.image(asset.key, asset.path);
    }
    const blendMask = resolveWorldVisualDepthBackdropBlendMask(WORLD_VISUAL_DEPTH_BACKDROPS, "?surfaceMotion=town-air");
    this.load.image(blendMask.key, blendMask.path);
    const weather = REVIEW.composition.weatherAtlas;
    this.load.spritesheet(weather.key, weather.path, { frameWidth: weather.frameWidth, frameHeight: weather.frameHeight });
    this.load.on("loaderror", () => { this.failedAssets += 1; });
  }

  create() {
    this.cameras.main.setBackgroundColor(REVIEW.backgroundColor)
      .setBounds(0, REVIEW.tileSize * 52, REVIEW.worldWidthTiles * REVIEW.tileSize, REVIEW.tileSize * 17)
      .setZoom(REVIEW.camera.defaultZoom);
    this.backgroundField = new GroundLevelBackgroundField(this, REVIEW, BACKGROUNDS);
    this.surface = new WorldVisualSurfaceStage(this, GROUND_LEVEL_SURFACE_CONFIG);
    this.surface.create();
    this.surface.far.forEach(image => image.setVisible(false));
    this.motionField = new GroundLevelMotionField(this, REVIEW);
    this.motionField.setMotionPercent(initial.motionPercent);
    this.chronology = new GroundLevelChronology(this, REVIEW, initial);
    this.configureInput();
    this.configureHud();
    this.jumpChapter(REVIEW.chapters[this.chapterIndex].id);
    this.exposeReviewApi();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.surface?.destroy();
    });
  }

  configureInput() {
    this.input.keyboard.on("keydown-Q", () => this.stepChapter(-1));
    this.input.keyboard.on("keydown-E", () => this.stepChapter(1));
    this.input.on("pointerdown", pointer => {
      this.drag = { x: pointer.x, scrollX: this.cameras.main.scrollX };
    });
    this.input.on("pointerup", () => { this.drag = null; });
    this.input.on("pointermove", pointer => {
      if (!this.drag || !pointer.isDown) return;
      this.cameras.main.scrollX = this.drag.scrollX - (pointer.x - this.drag.x) / this.cameras.main.zoom;
    });
    this.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      const zoom = Phaser.Math.Clamp(
        this.cameras.main.zoom - dy * REVIEW.camera.wheelZoomStep,
        REVIEW.camera.minimumZoom,
        REVIEW.camera.maximumZoom,
      );
      this.cameras.main.setZoom(zoom);
    });
  }

  configureHud() {
    this.hud = new GroundLevelHud(REVIEW, {
      stepChapter: delta => this.stepChapter(delta),
      jumpChapter: id => this.jumpChapter(id),
      setMotion: value => this.motionField.setMotionPercent(value),
      setDay: value => this.chronology.setDay(value),
      setHour: value => this.chronology.setHour(value),
      setWeather: value => this.chronology.setWeather(value),
      togglePause: () => {
        this.chronology.paused = !this.chronology.paused;
        return this.chronology.paused;
      },
    });
    this.hud.setInitialState(initial);
  }

  exposeReviewApi() {
    globalThis.__groundLevelWorldReview = {
      snapshot: () => this.snapshot(),
      jumpChapter: id => this.jumpChapter(id),
      setWeather: weather => this.chronology.setWeather(weather),
      setMotion: percent => this.motionField.setMotionPercent(percent),
      setDay: day => this.chronology.setDay(day),
      setHour: hour => this.chronology.setHour(hour),
    };
  }

  jumpChapter(id) {
    const index = REVIEW.chapters.findIndex(item => item.id === id);
    if (index >= 0) this.chapterIndex = index;
    const chapter = REVIEW.chapters[this.chapterIndex];
    this.cameras.main.centerOn(chapter.centerTile * REVIEW.tileSize, REVIEW.camera.centerTileY * REVIEW.tileSize);
    this.cameras.main.preRender();
    const backgroundProfile = this.backgroundField.setChapter(chapter.id);
    this.setTownStageEnabled(backgroundProfile.renderMode === "existing-town-video");
    this.motionField.setEnabled(backgroundProfile.renderMode === "segmented-runtime");
    this.hud?.setChapter(chapter);
  }

  setTownStageEnabled(enabled) {
    this.townStageEnabled = Boolean(enabled);
    this.surface.surfaceEdges.forEach(image => image.setVisible(this.townStageEnabled));
  }

  stepChapter(delta) {
    this.chapterIndex = Phaser.Math.Wrap(this.chapterIndex + delta, 0, REVIEW.chapters.length);
    this.jumpChapter(REVIEW.chapters[this.chapterIndex].id);
  }

  update(time, delta) {
    this.chronology.update(delta);
    const effective = this.motionField.motionPercent / 100 * REVIEW.motion.observatoryBenchmarkMultiplier;
    const lighting = this.chronology.lighting;
    const weatherScalar = REVIEW.motion.weatherSpeed[this.chronology.weather] || 1;
    this.surface.update(time, lighting);
    this.backgroundField.update(delta, time / 1000, effective, weatherScalar, lighting.farTint);
    this.motionField.update(delta, time / 1000, this.chronology);
    if (!this.lastSnapshotAt || time - this.lastSnapshotAt >= 250) {
      this.lastSnapshotAt = time;
      const snapshot = this.snapshot();
      document.body.dataset.runtimeSnapshot = JSON.stringify(snapshot);
      this.hud.update(snapshot);
    }
    this.resolveReady(time);
  }

  resolveReady(time) {
    if (this.ready || !this.backgroundField.profile) return;
    const townMotion = this.surface.surfacePack?.getMotionSnapshot?.() || null;
    const townSelected = this.backgroundField.profile.renderMode === "existing-town-video";
    if (townSelected && !townMotion?.ready && time < 3500) return;
    this.ready = true;
    document.body.classList.add("ready");
    document.body.dataset.groundLevelWorldReady = "true";
    document.body.dataset.townVideoChanged = "false";
  }

  snapshot() {
    return {
      ready: this.ready,
      reviewOnly: REVIEW.reviewOnly,
      productionChanged: REVIEW.productionChanged,
      assetPolicy: REVIEW.assetPolicy,
      benchmark: REVIEW.benchmark,
      chapterId: REVIEW.chapters[this.chapterIndex].id,
      chapterCount: REVIEW.chapters.length,
      backgroundOnly: true,
      singleFarBackdrop: false,
      backgroundProfileCount: BACKGROUNDS.profiles.length + 1,
      repeatedMoonBackdropsVisible: 0,
      hardBakedScenicChunks: 0,
      legacyPropOverlays: 0,
      legacyStructureOverlays: 0,
      floatingLegacyProps: 0,
      failedAssets: this.failedAssets,
      background: this.backgroundField.snapshot,
      motion: this.motionField.snapshot,
      actors: { placeholderActors: 0, canonicalPlayer: false, workers: 0 },
      chronology: this.chronology.snapshot,
      townStageEnabled: this.townStageEnabled,
      townMotion: this.surface.surfacePack?.getMotionSnapshot?.() || null,
      townVideoSha256Expected: REVIEW.townVideoSha256,
      townVideoChanged: false,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
      fps: Math.round(this.game.loop.actualFps || 0),
      camera: {
        tileX: Number((this.cameras.main.worldView.centerX / REVIEW.tileSize).toFixed(2)),
        tileY: Number((this.cameras.main.worldView.centerY / REVIEW.tileSize).toFixed(2)),
        zoom: Number(this.cameras.main.zoom.toFixed(2)),
      },
    };
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: REVIEW.viewport.width,
  height: REVIEW.viewport.height,
  parent: "map",
  backgroundColor: REVIEW.backgroundColor,
  render: { antialias: true, roundPixels: false, powerPreference: "high-performance" },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GroundLevelWorldScene],
});

import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import { WORLD_VISUAL_ABOVE_GROUND_FIDELITY_GATE_REVIEW as FIDELITY } from
  "../values/worldVisualAboveGroundFidelityGateReview.js";
import { WORLD_VISUAL_SKY_COHESION } from "../values/worldVisualSkyCohesion.js";
import { createCompleteMapBackgroundConfigs } from
  "./2026-08-30-above-ground-complete-map-background-config.js";
import {
  configureAboveGroundFidelityGateHud,
  refreshAboveGroundFidelityGateHud,
} from "./2026-08-30-above-ground-fidelity-gate-hud.js";
import {
  AboveGroundFidelityGateSystems,
  preloadAboveGroundFidelityGateAssets,
} from "./2026-08-30-above-ground-fidelity-gate-systems.js";

const runtimeIssues = [];
globalThis.__aboveGroundFidelityIssues = runtimeIssues;
globalThis.addEventListener("error", event => {
  runtimeIssues.push(event.error?.message || event.message || "Unknown runtime error");
});
globalThis.addEventListener("unhandledrejection", event => {
  runtimeIssues.push(event.reason?.message || String(event.reason || "Unhandled rejection"));
});

const pageUrl = new URL(globalThis.location.href);
if (!pageUrl.searchParams.has(FIDELITY.surfacePack.queryParam)) {
  pageUrl.searchParams.set(FIDELITY.surfacePack.queryParam, FIDELITY.surfacePack.staticValue);
  history.replaceState(null, "", pageUrl);
}
const params = pageUrl.searchParams;
const requestedView = params.get(FIDELITY.comparison.queryParam);
const runtimeEnabled = requestedView !== FIDELITY.comparison.sourceValue;
const surfaceConfig = createCompleteMapBackgroundConfigs(REVIEW).surface;
const plateAsset = WORLD_VISUAL_SKY_COHESION.assets[FIDELITY.plate.assetId];

class AboveGroundFidelityGateScene extends Phaser.Scene {
  constructor() {
    super("AboveGroundFidelityGateScene");
    this.configReview = FIDELITY;
    this.runtimeEnabled = runtimeEnabled;
    this.motionEnabled = FIDELITY.runtime.defaultMotionEnabled;
    this.drag = null;
    this.ready = false;
    this.config = {
      tileSize: REVIEW.tileSize,
      topAirRows: REVIEW.surfaceTileY,
      worldWidthTiles: 280,
      worldWidthPx: 280 * REVIEW.tileSize,
      worldDepthTiles: REVIEW.map.bottomTileExclusive,
      viewportWidth: REVIEW.width,
      viewportHeight: REVIEW.height,
      spawnTileX: FIDELITY.camera.centerTileX,
    };
  }

  preload() {
    preloadAboveGroundFidelityGateAssets(
      this,
      surfaceConfig,
      plateAsset,
      FIDELITY,
    );
  }

  create() {
    const tileSize = REVIEW.tileSize;
    const panLimit = FIDELITY.camera.horizontalPanLimitTiles;
    const viewportWorldWidth = REVIEW.width / REVIEW.camera.defaultZoom;
    const left = FIDELITY.camera.centerTileX * tileSize
      - viewportWorldWidth / 2
      - panLimit * tileSize;
    const width = viewportWorldWidth + panLimit * 2 * tileSize;
    const height = REVIEW.map.bottomTileExclusive * tileSize;
    this.cameras.main
      .setBackgroundColor(REVIEW.backgroundColor)
      .setBounds(left, 0, width, height)
      .setZoom(REVIEW.camera.defaultZoom)
      .centerOn(
        FIDELITY.camera.centerTileX * tileSize,
        FIDELITY.camera.centerTileY * tileSize,
      );
    this.cameras.main.preRender();
    this.runtime = new AboveGroundFidelityGateSystems(
      this,
      REVIEW,
      FIDELITY,
      surfaceConfig,
      plateAsset,
      this.runtimeEnabled,
    );
    this.runtime.create();
    this.configureInput();
    configureAboveGroundFidelityGateHud(this, FIDELITY);
    const weather = params.get("weather") || FIDELITY.initialWeatherId;
    this.setWeather(weather);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.runtime?.destroy());
  }

  configureInput() {
    this.keys = this.input.keyboard.addKeys("A,D,LEFT,RIGHT");
    this.input.keyboard.on("keydown-R", () => this.setView(
      this.runtimeEnabled
        ? FIDELITY.comparison.sourceValue
        : FIDELITY.comparison.runtimeValue,
    ));
    this.input.on("pointerdown", pointer => {
      this.drag = { x: pointer.x, scrollX: this.cameras.main.scrollX };
    });
    this.input.on("pointerup", () => { this.drag = null; });
    this.input.on("pointermove", pointer => {
      if (!this.drag || !pointer.isDown) return;
      this.cameras.main.scrollX = this.drag.scrollX
        - (pointer.x - this.drag.x) / this.cameras.main.zoom;
      this.runtime.sync(false);
    });
  }

  setView(view) {
    const url = new URL(globalThis.location.href);
    url.searchParams.set(FIDELITY.comparison.queryParam, view);
    globalThis.location.href = url.href;
  }

  setWeather(id) {
    const selected = this.runtime.setWeather(id);
    const url = new URL(globalThis.location.href);
    url.searchParams.set("weather", selected);
    history.replaceState(null, "", url);
  }

  toggleMotion() {
    this.motionEnabled = !this.motionEnabled;
    this.runtime.setMotion(this.motionEnabled);
  }

  update(time, delta) {
    const direction = (this.keys.A.isDown || this.keys.LEFT.isDown ? -1 : 0)
      + (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0);
    this.cameras.main.scrollX += direction
      * REVIEW.camera.panSpeedTilesPerSecond * REVIEW.tileSize * delta / 1000;
    this.runtime.sync(false);
    this.runtime.update(time, delta);

    if (!this.ready && this.runtime.isReady()) {
      this.ready = true;
      document.body.classList.add("ready");
      document.body.dataset.aboveGroundFidelityGateReady = "true";
    }
    if (!this.lastDatasetUpdate || time - this.lastDatasetUpdate >= FIDELITY.runtime.hudRefreshMs) {
      this.lastDatasetUpdate = time;
      const snapshot = {
        ...this.runtime.snapshot(),
        renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
        fps: this.game.loop.actualFps || 0,
      };
      document.body.dataset.runtimeSnapshot = JSON.stringify(snapshot);
      refreshAboveGroundFidelityGateHud(this, snapshot);
    }
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
  scene: [AboveGroundFidelityGateScene],
});

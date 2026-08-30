import { OBSERVATORY_LAYERED_ATMOSPHERE_REVIEW as CONFIG } from "../../../values/observatoryLayeredAtmosphereReview.js";
import { ObservatoryCloudFlowPipeline } from "./ObservatoryCloudFlowPipeline.js";
import { ObservatoryEmissivePipeline } from "./ObservatoryEmissivePipeline.js";

const page = {
  status: document.querySelector("#status"), pause: document.querySelector("#pause"),
  motion: document.querySelector("#motion"), lights: document.querySelector("#lights"),
  motionValue: document.querySelector("#motionValue"), lightValue: document.querySelector("#lightValue"),
  pipeline: document.querySelector("#pipeline"), phase: document.querySelector("#phase"),
  fps: document.querySelector("#fps"), layerCount: document.querySelector("#layerCount"),
  lightCount: document.querySelector("#lightCount"), townGuard: document.querySelector("#townGuard"),
  splitLabels: document.querySelector("#splitLabels"),
  viewButtons: [...document.querySelectorAll("[data-view]")],
};

const search = new URLSearchParams(location.search);
const requestedView = search.get("view");
const initialView = CONFIG.viewModes.includes(requestedView) ? requestedView : CONFIG.defaults.view;
const requestedPhase = Number(search.get("phase"));
const initialPhase = Number.isFinite(requestedPhase) ? Phaser.Math.Clamp(requestedPhase, 0, 1) : 0;

class ObservatoryLayeredScene extends Phaser.Scene {
  constructor() {
    super(CONFIG.sceneKey);
    this.elapsedSeconds = initialPhase * CONFIG.loopSeconds;
    this.state = {
      paused: search.get("paused") === "1" || CONFIG.defaults.paused,
      motionStrength: CONFIG.defaults.motionStrength,
      lightStrength: CONFIG.defaults.lightStrength,
      view: initialView,
    };
    this.cloudEntries = [];
    this.runtimeObjects = [];
    this.manifest = null;
  }

  preload() {
    const images = [CONFIG.source, CONFIG.staticSky, CONFIG.architecture, CONFIG.emissive, CONFIG.lightIds, CONFIG.segmentationReview];
    images.forEach(asset => this.load.image(asset.key, asset.path));
    CONFIG.cloudLayers.forEach(layer => this.load.image(layer.key, layer.path));
    this.load.json("observatory-layer-manifest", "./pack/manifest-v2.json");
  }

  create() {
    if (this.game.renderer.type !== Phaser.WEBGL) throw new Error("WebGL is required for the layered mockup.");
    this.game.renderer.pipelines.addPostPipeline(CONFIG.cloudPipelineKey, ObservatoryCloudFlowPipeline);
    this.game.renderer.pipelines.addPostPipeline(CONFIG.lightPipelineKey, ObservatoryEmissivePipeline);
    this.manifest = this.cache.json.get("observatory-layer-manifest");

    this.sourceImage = this.makeImage(CONFIG.source.key);
    this.runtimeObjects.push(this.makeImage(CONFIG.staticSky.key));
    const layersByKey = new Map(CONFIG.cloudLayers.map(profile => [profile.key, this.makeCloud(profile)]));
    this.runtimeObjects.push(layersByKey.get("upper-wisps"), layersByKey.get("upper-crown"));
    this.runtimeObjects.push(layersByKey.get("horizon-mist"), layersByKey.get("cloud-sea-far"));
    this.runtimeObjects.push(this.makeImage(CONFIG.architecture.key), layersByKey.get("cloud-sea-near"));
    this.emissiveImage = this.makeImage(CONFIG.emissive.key).setBlendMode(Phaser.BlendModes.ADD);
    this.emissiveImage.setPostPipeline(CONFIG.lightPipelineKey);
    this.emissivePipeline = this.resolvePostPipeline(this.emissiveImage, CONFIG.lightPipelineKey);
    this.runtimeObjects.push(this.emissiveImage);

    this.segmentImage = this.makeImage(CONFIG.segmentationReview.key);
    this.lightInspection = [
      this.makeImage(CONFIG.architecture.key),
      this.makeImage(CONFIG.lightIds.key).setBlendMode(Phaser.BlendModes.ADD),
    ];
    this.createSplitMasks();
    this.installReviewApi();
    this.applyView();
    this.updatePageState();
  }

  makeImage(key) {
    return this.add.image(CONFIG.viewport.width / 2, CONFIG.viewport.height / 2, key)
      .setDisplaySize(CONFIG.viewport.width, CONFIG.viewport.height);
  }

  makeCloud(profile) {
    const image = this.makeImage(profile.key);
    image.setPostPipeline(CONFIG.cloudPipelineKey);
    const pipeline = this.resolvePostPipeline(image, CONFIG.cloudPipelineKey);
    if (!pipeline) throw new Error(`Cloud pipeline did not attach to ${profile.key}.`);
    this.cloudEntries.push({ image, pipeline, profile });
    return image;
  }

  resolvePostPipeline(image, key) {
    const pipeline = image.getPostPipeline(key);
    return Array.isArray(pipeline) ? pipeline.at(-1) || null : pipeline;
  }

  createSplitMasks() {
    const midpoint = CONFIG.viewport.width / 2;
    const leftGraphic = this.make.graphics({ add: false }).fillStyle(0xffffff).fillRect(0, 0, midpoint, CONFIG.viewport.height);
    const rightGraphic = this.make.graphics({ add: false }).fillStyle(0xffffff).fillRect(midpoint, 0, midpoint, CONFIG.viewport.height);
    this.leftMask = leftGraphic.createGeometryMask();
    this.rightMask = rightGraphic.createGeometryMask();
  }

  installReviewApi() {
    globalThis.__observatoryLayeredReview = {
      command: (command, value) => this.command(command, value),
      diagnostics: () => this.getDiagnostics(),
    };
    window.dispatchEvent(new CustomEvent("observatory-layered-ready"));
  }

  command(command, value) {
    if (command === "pause") this.state.paused = Boolean(value);
    if (command === "motion") this.state.motionStrength = Phaser.Math.Clamp(Number(value), 0, CONFIG.limits.motionStrength);
    if (command === "lights") this.state.lightStrength = Phaser.Math.Clamp(Number(value), 0, CONFIG.limits.lightStrength);
    if (command === "view" && CONFIG.viewModes.includes(value)) this.state.view = value;
    if (command === "phase") this.elapsedSeconds = Phaser.Math.Clamp(Number(value), 0, 1) * CONFIG.loopSeconds;
    this.applyView();
    this.updatePageState();
  }

  clearMasks() {
    this.sourceImage.clearMask(false);
    this.runtimeObjects.forEach(object => object.clearMask(false));
  }

  applyView() {
    const view = this.state.view;
    const isSource = view === "source";
    const isRuntime = view === "runtime";
    const isSplit = view === "split";
    this.clearMasks();
    this.sourceImage.setVisible(isSource || isSplit);
    this.runtimeObjects.forEach(object => object.setVisible(isRuntime || isSplit));
    this.segmentImage.setVisible(view === "layers");
    this.lightInspection.forEach(object => object.setVisible(view === "lights"));
    if (isSplit) {
      this.sourceImage.setMask(this.leftMask);
      this.runtimeObjects.forEach(object => object.setMask(this.rightMask));
    }
  }

  getDiagnostics() {
    return Object.freeze({
      reviewOnly: true,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
      phase: this.elapsedSeconds / CONFIG.loopSeconds,
      paused: this.state.paused,
      view: this.state.view,
      motionStrength: this.state.motionStrength,
      lightStrength: this.state.lightStrength,
      cloudLayers: this.cloudEntries.length,
      lightClusters: this.manifest?.decomposition?.lightClusterCount || 0,
      architectureStatic: true,
      sourceTexture: CONFIG.source.path,
      townVideoModified: this.manifest?.townSquareGuard?.modified ?? null,
      fps: this.game.loop.actualFps,
    });
  }

  updatePageState() {
    const ready = this.cloudEntries.length === CONFIG.cloudLayers.length && Boolean(this.emissivePipeline);
    page.status.dataset.state = ready ? "ready" : "loading";
    page.status.textContent = ready ? "Segmented runtime active" : "Loading segmented pack…";
    page.pipeline.textContent = ready ? "5 cloud flows + emissive" : "pending";
    page.pause.classList.toggle("paused", this.state.paused);
    page.pause.textContent = this.state.paused ? "Resume motion" : "Pause motion";
    page.splitLabels.hidden = this.state.view !== "split";
    page.viewButtons.forEach(button => button.classList.toggle("active", button.dataset.view === this.state.view));
    page.layerCount.textContent = String(this.manifest?.decomposition?.cloudLayerCount || 0);
    page.lightCount.textContent = String(this.manifest?.decomposition?.lightClusterCount || 0);
    const town = this.manifest?.townSquareGuard;
    page.townGuard.textContent = town?.modified === false ? `${town.sha256.slice(0, 12)}… unchanged` : "guard failed";
    document.body.dataset.pipeline = ready ? "active" : "pending";
    document.body.dataset.paused = String(this.state.paused);
    document.body.dataset.view = this.state.view;
    document.body.dataset.lightsSeparated = String(this.manifest?.decomposition?.lightsSeparated === true);
  }

  update(_time, delta) {
    if (!this.state.paused) this.elapsedSeconds = (this.elapsedSeconds + delta / 1000) % CONFIG.loopSeconds;
    const phase = this.elapsedSeconds / CONFIG.loopSeconds;
    this.cloudEntries.forEach(entry => entry.pipeline.setLayerState(phase, this.state.motionStrength, entry.profile));
    this.emissivePipeline?.setLightState(phase, this.state.lightStrength);
    page.phase.textContent = phase.toFixed(3);
    page.fps.textContent = this.game.loop.actualFps.toFixed(1);
    document.body.dataset.phase = phase.toFixed(6);
  }
}

const command = (name, value) => globalThis.__observatoryLayeredReview?.command(name, value);
page.pause.addEventListener("click", () => command("pause", document.body.dataset.paused !== "true"));
page.motion.addEventListener("input", () => {
  page.motionValue.value = `${page.motion.value}%`;
  command("motion", Number(page.motion.value) / 100);
});
page.lights.addEventListener("input", () => {
  page.lightValue.value = `${page.lights.value}%`;
  command("lights", Number(page.lights.value) / 100);
});
page.viewButtons.forEach(button => button.addEventListener("click", () => command("view", button.dataset.view)));

window.addEventListener("error", event => {
  page.status.dataset.state = "error";
  page.status.textContent = `Render failed: ${event.message}`;
  document.body.dataset.pipeline = "error";
});

new Phaser.Game({
  type: Phaser.WEBGL, parent: "game", width: CONFIG.viewport.width, height: CONFIG.viewport.height,
  backgroundColor: "#02050a",
  render: { antialias: true, pixelArt: false, roundPixels: false, powerPreference: "high-performance" },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [ObservatoryLayeredScene],
});

import { OBSERVATORY_AUTHORED_LAYERS_REVIEW as CONFIG } from "../../../values/observatoryAuthoredLayersReview.js";
import { TIME_CONFIG } from "../../../values/timeConfig.js";
import { ObservatoryArchitectureModuleField } from "./ObservatoryArchitectureModuleField.js";
import { ObservatoryCloudStreamField } from "./ObservatoryCloudStreamField.js";
import { ObservatoryCloudStreamPipeline } from "./ObservatoryCloudStreamPipeline.js";
import { ObservatoryAuthoredEmissivePipeline } from "./ObservatoryAuthoredEmissivePipeline.js";
import { ObservatoryAuthoredSkyPipeline } from "./ObservatoryAuthoredSkyPipeline.js";
import { ObservatoryInteriorLifeField } from "./ObservatoryInteriorLifeField.js";

const page = {
  status: document.querySelector("#status"), pause: document.querySelector("#pause"),
  motion: document.querySelector("#motion"), islands: document.querySelector("#islands"), lights: document.querySelector("#lights"), stars: document.querySelector("#stars"),
  motionValue: document.querySelector("#motionValue"), islandValue: document.querySelector("#islandValue"), lightValue: document.querySelector("#lightValue"), starValue: document.querySelector("#starValue"),
  worldDay: document.querySelector("#worldDay"), dayValue: document.querySelector("#dayValue"), worldTime: document.querySelector("#worldTime"), timeValue: document.querySelector("#timeValue"), weather: document.querySelector("#weather"),
  pipeline: document.querySelector("#pipeline"), phase: document.querySelector("#phase"), fps: document.querySelector("#fps"),
  layerCount: document.querySelector("#layerCount"), regionCount: document.querySelector("#regionCount"), architectureCount: document.querySelector("#architectureCount"), lifecycleCount: document.querySelector("#lifecycleCount"), motionSystemCount: document.querySelector("#motionSystemCount"), lightCount: document.querySelector("#lightCount"), humanCount: document.querySelector("#humanCount"), calendar: document.querySelector("#calendar"),
  sourceReuse: document.querySelector("#sourceReuse"), townGuard: document.querySelector("#townGuard"),
  splitLabels: document.querySelector("#splitLabels"), viewButtons: [...document.querySelectorAll("[data-view]")],
};

const search = new URLSearchParams(location.search);
const requestedView = search.get("view");
const initialView = CONFIG.viewModes.includes(requestedView) ? requestedView : CONFIG.defaults.view;
const requestedPhase = Number(search.get("phase"));
const initialPhase = Number.isFinite(requestedPhase) ? Phaser.Math.Clamp(requestedPhase, 0, 1) : 0;
const requestedDay = Number(search.get("day"));
const initialDayNumber = Number.isFinite(requestedDay)
  ? Phaser.Math.Clamp(requestedDay, 1, CONFIG.worldChronology.reviewMaximumDay)
  : CONFIG.worldChronology.defaultDay;
const requestedHour = Number(search.get("hour"));
const initialHour = Number.isFinite(requestedHour)
  ? Phaser.Math.Clamp(requestedHour, 0, 23.99)
  : CONFIG.worldChronology.defaultHour;
const initialWorldDay = Math.floor(initialDayNumber) + initialHour / 24;
const requestedWeather = search.get("weather");
const initialWeather = CONFIG.worldChronology.weatherKinds.includes(requestedWeather)
  ? requestedWeather
  : CONFIG.worldChronology.defaultWeather;

class ObservatoryAuthoredScene extends Phaser.Scene {
  constructor() {
    super(CONFIG.sceneKey);
    this.elapsedSeconds = initialPhase * CONFIG.loopSeconds;
    this.state = {
      paused: search.get("paused") === "1" || CONFIG.defaults.paused,
      motionStrength: CONFIG.defaults.motionStrength,
      islandStrength: CONFIG.defaults.islandStrength,
      lightStrength: CONFIG.defaults.lightStrength,
      starStrength: CONFIG.defaults.starStrength,
      worldDay: initialWorldDay,
      weather: initialWeather,
      weatherIntensity: initialWeather === "clear" ? 0 : 1,
      view: initialView,
    };
    this.cloudFields = [];
    this.architectureField = null;
    this.interiorLifeField = null;
    this.runtimeObjects = [];
    this.manifest = null;
  }

  preload() {
    [CONFIG.reference, CONFIG.sky, CONFIG.stars, CONFIG.architecture, CONFIG.emissive, CONFIG.lightIds, CONFIG.layerReview]
      .forEach(asset => this.load.image(asset.key, asset.path));
    CONFIG.cloudLayers.forEach(layer => this.load.atlas(layer.atlasKey, layer.texturePath, layer.atlasPath));
    this.load.atlas(CONFIG.architectureModules.atlasKey, CONFIG.architectureModules.texturePath, CONFIG.architectureModules.atlasPath);
    this.load.atlas(CONFIG.architectureModules.emissiveAtlasKey, CONFIG.architectureModules.emissiveTexturePath, CONFIG.architectureModules.emissiveAtlasPath);
    this.load.atlas(CONFIG.interiorLife.atlasKey, CONFIG.interiorLife.texturePath, CONFIG.interiorLife.atlasPath);
    this.load.json("observatory-authored-manifest", "./pack/manifest-v3.json");
  }

  create() {
    if (this.game.renderer.type !== Phaser.WEBGL) throw new Error("WebGL is required for the authored-layer mockup.");
    this.game.renderer.pipelines.addPostPipeline(CONFIG.cloudStreamPipelineKey, ObservatoryCloudStreamPipeline);
    this.game.renderer.pipelines.addPostPipeline(CONFIG.emissivePipelineKey, ObservatoryAuthoredEmissivePipeline);
    this.game.renderer.pipelines.addPostPipeline(CONFIG.skyPipelineKey, ObservatoryAuthoredSkyPipeline);
    this.manifest = this.cache.json.get("observatory-authored-manifest");

    this.sourceImage = this.makeImage(CONFIG.reference.key);
    this.skyImage = this.makeImage(CONFIG.sky.key);
    this.runtimeObjects.push(this.skyImage);
    const profiles = new Map(CONFIG.cloudLayers.map(profile => [profile.key, profile]));
    this.starImage = this.makeImage(CONFIG.stars.key).setBlendMode(Phaser.BlendModes.ADD).setPostPipeline(CONFIG.skyPipelineKey);
    this.skyPipeline = this.resolvePostPipeline(this.starImage, CONFIG.skyPipelineKey);
    this.runtimeObjects.push(this.starImage);
    this.addCloudField(profiles.get("upper"));
    this.addCloudField(profiles.get("horizon"));
    this.addCloudField(profiles.get("lower"));
    this.addArchitectureField();
    this.addInteriorLifeField();
    this.addCloudField(profiles.get("near"));

    this.layerInspection = this.makeImage(CONFIG.layerReview.key);
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

  addCloudField(profile) {
    const modules = this.manifest?.cloudModules?.[profile.key]?.modules || [];
    const field = new ObservatoryCloudStreamField(this, profile, modules, CONFIG.viewport, CONFIG.sourceSize, CONFIG.cloudStreamPipelineKey);
    this.cloudFields.push(field);
    this.runtimeObjects.push(...field.images);
  }

  addArchitectureField() {
    const modules = this.manifest?.architectureModules?.modules || [];
    this.architectureField = new ObservatoryArchitectureModuleField(this, CONFIG.architectureModules, modules, CONFIG.viewport, CONFIG.sourceSize, CONFIG.emissivePipelineKey);
    this.runtimeObjects.push(...this.architectureField.images);
  }

  addInteriorLifeField() {
    this.interiorLifeField = new ObservatoryInteriorLifeField(this, CONFIG.interiorLife, this.manifest.interiorLife, this.architectureField, CONFIG.viewport, CONFIG.sourceSize);
    this.runtimeObjects.push(...this.interiorLifeField.images);
  }

  resolvePostPipeline(image, key) {
    const pipeline = image.getPostPipeline(key);
    return Array.isArray(pipeline) ? pipeline.at(-1) || null : pipeline;
  }

  createSplitMasks() {
    const midpoint = CONFIG.viewport.width / 2;
    const left = this.make.graphics({ add: false }).fillStyle(0xffffff).fillRect(0, 0, midpoint, CONFIG.viewport.height);
    const right = this.make.graphics({ add: false }).fillStyle(0xffffff).fillRect(midpoint, 0, midpoint, CONFIG.viewport.height);
    this.leftMask = left.createGeometryMask();
    this.rightMask = right.createGeometryMask();
  }

  installReviewApi() {
    globalThis.__observatoryAuthoredReview = {
      command: (command, value) => this.command(command, value),
      diagnostics: () => this.getDiagnostics(),
    };
    window.dispatchEvent(new CustomEvent("observatory-authored-ready"));
  }

  command(command, value) {
    if (command === "pause") this.state.paused = Boolean(value);
    if (command === "motion") this.state.motionStrength = Phaser.Math.Clamp(Number(value), 0, CONFIG.limits.motionStrength);
    if (command === "islands") this.state.islandStrength = Phaser.Math.Clamp(Number(value), 0, CONFIG.limits.islandStrength);
    if (command === "lights") this.state.lightStrength = Phaser.Math.Clamp(Number(value), 0, CONFIG.limits.lightStrength);
    if (command === "stars") this.state.starStrength = Phaser.Math.Clamp(Number(value), 0, CONFIG.limits.starStrength);
    if (command === "day") {
      const dayNumber = Phaser.Math.Clamp(Math.floor(Number(value)), 1, CONFIG.worldChronology.reviewMaximumDay);
      this.state.worldDay = dayNumber + (this.state.worldDay - Math.floor(this.state.worldDay));
    }
    if (command === "time") {
      const hour = Phaser.Math.Clamp(Number(value), 0, 23.99);
      this.state.worldDay = Math.floor(this.state.worldDay) + hour / 24;
    }
    if (command === "weather" && CONFIG.worldChronology.weatherKinds.includes(value)) {
      this.state.weather = value;
      this.state.weatherIntensity = value === "clear" ? 0 : 1;
    }
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
    this.layerInspection.setVisible(view === "layers");
    this.lightInspection.forEach(object => object.setVisible(view === "lights"));
    if (isSplit) {
      this.sourceImage.setMask(this.leftMask);
      this.runtimeObjects.forEach(object => object.setMask(this.rightMask));
    }
  }

  getDiagnostics() {
    const chronology = this.getChronology();
    return Object.freeze({
      reviewOnly: true,
      renderer: this.game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas",
      phase: this.elapsedSeconds / CONFIG.loopSeconds,
      paused: this.state.paused,
      view: this.state.view,
      cloudLayers: this.cloudFields.length,
      cloudSegments: this.cloudFields.reduce((total, field) => total + field.segmentCount, 0),
      architectureModules: this.architectureField?.entries.length || 0,
      islandLifecycleModules: this.architectureField?.lifecycleCount || 0,
      islandMotion: this.architectureField?.motionSnapshot || null,
      interiorFigures: this.interiorLifeField?.entries.length || 0,
      motionSystems: CONFIG.motionSystems,
      chronology,
      lightClusters: this.manifest?.decomposition?.lightClusterCount || 0,
      architectureStatic: false,
      independentSourceCount: Object.keys(this.manifest?.sources || {}).length,
      runtimePixelReuseFromReference: this.manifest?.runtimePixelReuseFromReference,
      townVideoModified: this.manifest?.townSquareGuard?.modified ?? null,
      fps: this.game.loop.actualFps,
    });
  }

  getChronology() {
    const day = Math.max(1, this.state.worldDay);
    const dayNumber = Math.floor(day);
    const timeOfDay = day - dayNumber;
    const daysPerWeek = CONFIG.worldChronology.daysPerWeek;
    const daysPerMonth = CONFIG.worldChronology.daysPerMonth;
    const targetCloudFlow = CONFIG.worldChronology.weatherCloudFlow[this.state.weather] ?? 1;
    const targetCloudOpacity = CONFIG.worldChronology.weatherCloudOpacity[this.state.weather] ?? 1;
    return Object.freeze({
      day,
      dayNumber,
      timeOfDay,
      hour: timeOfDay * 24,
      week: Math.floor((dayNumber - 1) / daysPerWeek) + 1,
      weekPhase: ((day - 1) % daysPerWeek) / daysPerWeek,
      month: Math.floor((dayNumber - 1) / daysPerMonth) + 1,
      dayOfMonth: ((dayNumber - 1) % daysPerMonth) + 1,
      weather: this.state.weather,
      weatherIntensity: this.state.weatherIntensity,
      cloudFlow: 1 + (targetCloudFlow - 1) * this.state.weatherIntensity,
      cloudOpacity: 1 + (targetCloudOpacity - 1) * this.state.weatherIntensity,
      productionDayDurationMs: TIME_CONFIG.dayDurationMs,
    });
  }

  updatePageState() {
    const ready = this.cloudFields.length === CONFIG.cloudLayers.length
      && this.cloudFields.every(field => field.pipelines.length === field.segmentCount)
      && this.architectureField?.pipelines.length > 0
      && this.interiorLifeField?.entries.length === CONFIG.interiorLife.figures.length
      && Boolean(this.skyPipeline);
    page.status.dataset.state = ready ? "ready" : "loading";
    page.status.textContent = ready ? "Independent runtime active" : "Loading authored pack…";
    const cloudSegments = this.cloudFields.reduce((total, field) => total + field.segmentCount, 0);
    page.pipeline.textContent = ready ? `${cloudSegments} sharp wisps + ${this.manifest?.decomposition?.architectureModuleCount || 0} islands + ${this.interiorLifeField?.entries.length || 0} figures` : "pending";
    page.pause.classList.toggle("paused", this.state.paused);
    page.pause.textContent = this.state.paused ? "Resume simulation" : "Pause simulation";
    page.worldDay.value = String(Math.floor(this.state.worldDay));
    page.dayValue.value = `Day ${Math.floor(this.state.worldDay)}`;
    page.worldTime.value = String((this.state.worldDay - Math.floor(this.state.worldDay)) * 24);
    page.weather.value = this.state.weather;
    page.splitLabels.hidden = this.state.view !== "split";
    page.viewButtons.forEach(button => button.classList.toggle("active", button.dataset.view === this.state.view));
    page.layerCount.textContent = String(this.manifest?.decomposition?.cloudLayerCount || 0);
    page.regionCount.textContent = String(cloudSegments);
    page.architectureCount.textContent = String(this.manifest?.decomposition?.architectureModuleCount || 0);
    page.lifecycleCount.textContent = String(this.architectureField?.lifecycleCount || 0);
    page.motionSystemCount.textContent = String(CONFIG.motionSystems.length);
    page.lightCount.textContent = String(this.manifest?.decomposition?.lightClusterCount || 0);
    page.humanCount.textContent = String(this.interiorLifeField?.entries.length || 0);
    page.sourceReuse.textContent = this.manifest?.runtimePixelReuseFromReference === false ? "0 pixels" : "guard failed";
    const town = this.manifest?.townSquareGuard;
    page.townGuard.textContent = town?.modified === false ? `${town.sha256.slice(0, 12)}… unchanged` : "guard failed";
    document.body.dataset.pipeline = ready ? "active" : "pending";
    document.body.dataset.paused = String(this.state.paused);
    document.body.dataset.view = this.state.view;
    document.body.dataset.weather = this.state.weather;
    document.body.dataset.worldDay = this.state.worldDay.toFixed(4);
    document.body.dataset.runtimePixelReuse = String(this.manifest?.runtimePixelReuseFromReference);
  }

  update(_time, delta) {
    if (!this.state.paused) {
      this.elapsedSeconds = (this.elapsedSeconds + delta / 1000) % CONFIG.loopSeconds;
      this.state.worldDay += delta / TIME_CONFIG.dayDurationMs;
    }
    const phase = this.elapsedSeconds / CONFIG.loopSeconds;
    const chronology = this.getChronology();
    this.cloudFields.forEach(field => field.update(phase, this.state.motionStrength, chronology));
    this.architectureField?.update(phase, this.state.islandStrength, this.state.lightStrength, chronology);
    this.interiorLifeField?.update(phase);
    this.skyPipeline?.setSkyState(phase, this.state.starStrength);
    page.phase.textContent = phase.toFixed(3);
    page.fps.textContent = this.game.loop.actualFps.toFixed(1);
    page.dayValue.value = `Day ${chronology.dayNumber}`;
    page.worldDay.value = String(chronology.dayNumber);
    page.timeValue.value = `${String(Math.floor(chronology.hour)).padStart(2, "0")}:${String(Math.floor((chronology.hour % 1) * 60)).padStart(2, "0")}`;
    page.worldTime.value = String(chronology.hour);
    page.calendar.textContent = `month ${chronology.month} · week ${chronology.week} · day ${chronology.dayOfMonth} · ${page.timeValue.value} · ${chronology.weather}`;
    document.body.dataset.phase = phase.toFixed(6);
    document.body.dataset.worldDay = chronology.day.toFixed(6);
  }
}

const command = (name, value) => globalThis.__observatoryAuthoredReview?.command(name, value);
page.pause.addEventListener("click", () => command("pause", document.body.dataset.paused !== "true"));
for (const [control, output, name, divisor] of [[page.motion, page.motionValue, "motion", 100], [page.islands, page.islandValue, "islands", 100], [page.lights, page.lightValue, "lights", 100], [page.stars, page.starValue, "stars", 100]]) {
  control.addEventListener("input", () => {
    output.value = `${control.value}%`;
    command(name, Number(control.value) / divisor);
  });
}
page.worldDay.addEventListener("input", () => command("day", Number(page.worldDay.value)));
page.worldTime.addEventListener("input", () => command("time", Number(page.worldTime.value)));
page.weather.addEventListener("change", () => command("weather", page.weather.value));
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
  scene: [ObservatoryAuthoredScene],
});

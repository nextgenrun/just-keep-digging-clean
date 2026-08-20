import { MIXAMO_PUNCH_SEQUENCE_REVIEW as config } from "../../../values/mixamoPunchSequenceReview.js";
const elements = {
  playPause: document.querySelector("#play-pause"),
  restart: document.querySelector("#restart"),
  clear: document.querySelector("#clear"),
  speed: document.querySelector("#speed"),
  gameScale: document.querySelector("#game-scale"),
  summary: document.querySelector("#summary"),
  builderCanvas: document.querySelector("#builder-canvas"),
  builderMode: document.querySelector("#builder-mode"),
  builderReadout: document.querySelector("#builder-readout"),
  presets: document.querySelector("#presets"),
  strikeSelects: [...document.querySelectorAll(".strike-select")],
  sequenceLibrary: document.querySelector("#sequence-library"),
  motionLibrary: document.querySelector("#motion-library"),
  sequenceTemplate: document.querySelector("#sequence-template"),
  motionTemplate: document.querySelector("#motion-template"),
};
const assets = new Map([
  ...config.motions.map((motion) => [motion.id, motion]),
  ...Object.entries(config.current).map(([mode, asset]) => [`current-${mode}`, asset]),
]);
const state = {
  elapsedMs: 0,
  lastMs: performance.now(),
  lastPaintMs: 0,
  speed: 1,
  playing: true,
  images: new Map(),
  verdicts: {},
  sequenceCards: [],
  motionCards: [],
  builderTimeline: [],
  builderMode: "side",
  activePresetId: "side-rhythm",
};
window.__MIXAMO_PUNCH_SEQUENCE_REVIEW__ = {
  ready: false,
  reviewOnly: config.reviewOnly,
  productionChanged: config.productionChanged,
  snapshot: () => ({ ...state.verdicts }),
};
function loadVerdicts() {
  try { state.verdicts = JSON.parse(localStorage.getItem(config.storageKey) || "{}"); }
  catch { state.verdicts = {}; }
}
function saveVerdicts() {
  try { localStorage.setItem(config.storageKey, JSON.stringify(state.verdicts)); }
  catch { /* review still works without persistence */ }
}
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${source}`));
    image.src = source;
  });
}
function compile(segments) {
  const timeline = [];
  segments.forEach((segment) => {
    const asset = assets.get(segment.clip);
    if (!asset) return;
    for (let frame = segment.from; frame <= segment.to; frame += 1) {
      timeline.push({ asset, frame, contact: asset.contacts.includes(frame) });
    }
    const last = timeline.at(-1);
    for (let hold = 0; last && hold < segment.holdAfterFrames; hold += 1) {
      timeline.push({ ...last, contact: false });
    }
  });
  return timeline;
}
function setupCanvas(canvas) {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(config.stage.canvasWidthPx * ratio);
  canvas.height = Math.round(config.stage.canvasHeightPx * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}
function drawBackdrop(context, mode, contact) {
  const { canvasWidthPx: width, canvasHeightPx: height, groundYpx: ground, tileSizePx: tile } = config.stage;
  const gradient = context.createRadialGradient(width * 0.45, height * 0.42, 18, width * 0.5, height * 0.55, width * 0.62);
  gradient.addColorStop(0, "#1b343b");
  gradient.addColorStop(1, "#061115");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const target = mode === "up"
    ? { x: 194, y: 12 }
    : mode === "down"
      ? { x: 216, y: 196 }
      : { x: 238, y: ground - tile };
  context.fillStyle = contact ? "#7b5a22" : "#293d43";
  context.strokeStyle = contact ? "#ffc96b" : "#567078";
  context.lineWidth = contact ? 4 : 2;
  context.fillRect(target.x, target.y, tile, tile);
  context.strokeRect(target.x, target.y, tile, tile);
  context.strokeStyle = contact ? "rgba(255,210,115,.9)" : "rgba(125,155,160,.28)";
  context.beginPath();
  context.moveTo(target.x + 15, target.y + 12);
  context.lineTo(target.x + 45, target.y + 42);
  context.lineTo(target.x + 28, target.y + 70);
  context.moveTo(target.x + 72, target.y + 10);
  context.lineTo(target.x + 55, target.y + 63);
  context.stroke();
  context.strokeStyle = "rgba(244,189,105,.46)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(14, ground);
  context.lineTo(width - 14, ground);
  context.stroke();
}
function drawFrame(canvas, entry, mode) {
  const context = setupCanvas(canvas);
  drawBackdrop(context, mode, entry?.contact === true);
  if (!entry) return;
  const { asset, frame } = entry;
  const size = elements.gameScale.checked ? config.stage.gameDisplaySizePx : config.stage.reviewDisplaySizePx;
  const sx = (frame % asset.columns) * asset.frameWidth;
  const sy = Math.floor(frame / asset.columns) * asset.frameHeight;
  const x = config.stage.characterXpx - size * config.stage.originX;
  const y = config.stage.groundYpx - size * config.stage.originY;
  context.drawImage(
    state.images.get(asset.id),
    sx,
    sy,
    asset.frameWidth,
    asset.frameHeight,
    x,
    y,
    size,
    size,
  );
  const colliderX = config.stage.characterXpx - config.stage.colliderWidthPx / 2;
  const colliderY = config.stage.groundYpx - config.stage.colliderHeightPx;
  context.setLineDash([4, 3]);
  context.strokeStyle = "rgba(118,219,235,.62)";
  context.strokeRect(colliderX, colliderY, config.stage.colliderWidthPx, config.stage.colliderHeightPx);
  context.setLineDash([]);
}
function timelineIndex(timeline, cycleLength = timeline.length) {
  if (!timeline.length) return 0;
  const cycleFrame = Math.floor((state.elapsedMs / 1000) * 30 * state.speed) % Math.max(1, cycleLength);
  return Math.min(timeline.length - 1, Math.floor((cycleFrame / Math.max(1, cycleLength)) * timeline.length));
}
function verdictFor(key) { return state.verdicts[key] || "unreviewed"; }
function refreshVerdict(card) {
  const verdict = verdictFor(card.key);
  card.badge.textContent = verdict;
  card.badge.className = `verdict ${verdict}`;
  card.buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.verdict === verdict));
}
function setVerdict(card, verdict) {
  state.verdicts[card.key] = verdict;
  saveVerdicts();
  refreshVerdict(card);
  updateSummary();
}
function bindVerdict(card) {
  card.buttons.forEach((button) => button.addEventListener("click", () => setVerdict(card, button.dataset.verdict)));
  refreshVerdict(card);
}
function updateSummary() {
  const keys = [...state.sequenceCards, ...state.motionCards].map((card) => card.key);
  const counts = { accept: 0, maybe: 0, reject: 0, unreviewed: 0 };
  keys.forEach((key) => { counts[verdictFor(key)] += 1; });
  elements.summary.textContent = `${counts.accept} accepted · ${counts.maybe} maybe · ${counts.reject} rejected · ${counts.unreviewed} unreviewed`;
}

function createSequenceCard(recipe) {
  const root = elements.sequenceTemplate.content.firstElementChild.cloneNode(true);
  root.querySelector("h3").textContent = recipe.label;
  root.querySelector(".mode").textContent = recipe.mode;
  root.querySelector(".description").textContent = recipe.description;
  const candidate = compile(recipe.candidate);
  const baseline = compile(recipe.baseline);
  root.querySelector(".timeline").textContent = `${candidate.filter((frame) => frame.contact).length} marked contacts · ${candidate.length} review frames · 30 FPS`;
  const card = {
    key: `recipe:${recipe.id}`,
    recipe,
    candidate,
    baseline,
    root,
    currentCanvas: root.querySelector("canvas.current"),
    candidateCanvas: root.querySelector("canvas.candidate"),
    badge: root.querySelector(".verdict"),
    buttons: [...root.querySelectorAll(".decisions button")],
  };
  bindVerdict(card);
  elements.sequenceLibrary.append(root);
  return card;
}

function createMotionCard(motion) {
  const root = elements.motionTemplate.content.firstElementChild.cloneNode(true);
  root.querySelector("h3").textContent = motion.label;
  root.querySelector(".mode").textContent = motion.category || "source";
  root.querySelector(".role").textContent = motion.role;
  root.querySelector("img").src = motion.file;
  root.querySelector("img").alt = `${motion.label} retargeted to the Survival character`;
  root.querySelector(".contacts").textContent = `${motion.frames} frames · contact ${motion.contacts.join(", ")} · V4 Survival render`;
  const card = {
    key: `motion:${motion.id}`,
    root,
    badge: root.querySelector(".verdict"),
    buttons: [...root.querySelectorAll(".decisions button")],
  };
  bindVerdict(card);
  elements.motionLibrary.append(root);
  return card;
}

function rebuildCustom() {
  state.activePresetId = null;
  [...elements.presets.children].forEach((button) => button.classList.remove("is-active"));
  const segments = elements.strikeSelects.map((select) => {
    const motion = assets.get(select.value);
    return { clip: motion.id, from: motion.comboRange.from, to: motion.comboRange.to, holdAfterFrames: 1 };
  });
  state.builderTimeline = compile(segments);
  state.builderMode = elements.builderMode.value;
  state.elapsedMs = 0;
}

function selectPreset(recipe) {
  state.activePresetId = recipe.id;
  state.builderTimeline = compile(recipe.candidate);
  state.builderMode = recipe.mode;
  elements.builderMode.value = recipe.mode;
  [...elements.presets.children].forEach((button) => button.classList.toggle("is-active", button.dataset.id === recipe.id));
  state.elapsedMs = 0;
}

function buildControls() {
  config.motions.forEach((motion) => elements.strikeSelects.forEach((select) => {
    const option = document.createElement("option");
    option.value = motion.id;
    option.textContent = motion.label;
    select.append(option);
  }));
  ["jab", "cross", "hook"].forEach((id, index) => { elements.strikeSelects[index].value = id; });
  elements.strikeSelects.forEach((select) => select.addEventListener("change", rebuildCustom));
  elements.builderMode.addEventListener("change", rebuildCustom);
  config.recipes.forEach((recipe) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = recipe.id;
    button.textContent = recipe.label;
    button.addEventListener("click", () => selectPreset(recipe));
    elements.presets.append(button);
  });
  elements.playPause.addEventListener("click", () => {
    state.playing = !state.playing;
    elements.playPause.textContent = state.playing ? "Pause" : "Play";
  });
  elements.restart.addEventListener("click", () => { state.elapsedMs = 0; });
  elements.clear.addEventListener("click", () => {
    state.verdicts = {}; saveVerdicts(); [...state.sequenceCards, ...state.motionCards].forEach(refreshVerdict); updateSummary();
  });
  elements.speed.addEventListener("change", () => { state.speed = Number(elements.speed.value) || 1; });
  selectPreset(config.recipes[0]);
}

function render(now) {
  if (state.playing) state.elapsedMs += Math.min(config.stage.maximumDeltaMs, Math.max(0, now - state.lastMs));
  state.lastMs = now;
  if (now - state.lastPaintMs < 1000 / 30) { requestAnimationFrame(render); return; }
  state.lastPaintMs = now;
  const builderIndex = timelineIndex(state.builderTimeline);
  const builderFrame = state.builderTimeline[builderIndex];
  drawFrame(elements.builderCanvas, builderFrame, state.builderMode);
  elements.builderReadout.textContent = builderFrame
    ? `${state.activePresetId ? "Preset" : "Custom"} · ${state.builderMode.toUpperCase()} · ${builderFrame.asset.label} · frame ${builderFrame.frame}${builderFrame.contact ? " · CONTACT" : ""}`
    : "No sequence frames";
  state.sequenceCards.forEach((card) => {
    const cycle = Math.max(card.baseline.length, card.candidate.length);
    drawFrame(card.currentCanvas, card.baseline[timelineIndex(card.baseline, cycle)], card.recipe.mode);
    drawFrame(card.candidateCanvas, card.candidate[timelineIndex(card.candidate, cycle)], card.recipe.mode);
  });
  requestAnimationFrame(render);
}

async function start() {
  loadVerdicts();
  const loaded = await Promise.all([...assets.values()].map(async (asset) => [asset.id, await loadImage(asset.sheet)]));
  loaded.forEach(([id, image]) => state.images.set(id, image));
  state.sequenceCards = config.recipes.map(createSequenceCard);
  state.motionCards = config.motions.map(createMotionCard);
  buildControls();
  updateSummary();
  window.__MIXAMO_PUNCH_SEQUENCE_REVIEW__.ready = true;
  requestAnimationFrame(render);
}

start().catch((error) => {
  console.error(error);
  elements.summary.textContent = `Sandbox failed: ${error.message}`;
});

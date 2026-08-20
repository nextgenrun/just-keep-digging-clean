import { MIXAMO_REPLACEMENT_REVIEW as config } from "../../../values/mixamoReplacementReview.js";

const elements = {
  library: document.querySelector("#library"),
  template: document.querySelector("#card-template"),
  filters: document.querySelector("#filters"),
  gameScale: document.querySelector("#game-scale"),
  clear: document.querySelector("#clear"),
  summary: document.querySelector("#summary"),
};
const state = { elapsedMs: 0, lastMs: performance.now(), filter: "all", cards: [], images: new Map(), verdicts: {} };

window.__MIXAMO_REPLACEMENT_REVIEW__ = {
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
  try { localStorage.setItem(config.storageKey, JSON.stringify(state.verdicts)); } catch { /* local review still works */ }
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

function currentFrame(asset) {
  const index = Math.floor((state.elapsedMs / 1000) * asset.fps) % asset.frameCount;
  return asset.frames ? asset.frames[index] : index;
}

function drawCurrent(card) {
  const asset = config.current[card.candidate.current];
  const canvas = card.canvas;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(config.stage.canvasWidthPx * ratio);
  canvas.height = Math.round(config.stage.canvasHeightPx * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const gradient = context.createRadialGradient(130, 100, 20, 130, 120, 180);
  gradient.addColorStop(0, "#1b3036"); gradient.addColorStop(1, "#071013");
  context.fillStyle = gradient; context.fillRect(0, 0, config.stage.canvasWidthPx, config.stage.canvasHeightPx);
  const size = elements.gameScale.checked ? config.stage.runtimeDisplaySizePx : config.stage.displaySizePx;
  const frame = currentFrame(asset);
  const sx = (frame % asset.columns) * asset.frameWidth;
  const sy = Math.floor(frame / asset.columns) * asset.frameHeight;
  const x = config.stage.canvasWidthPx / 2 - size * config.stage.originX;
  const ground = config.stage.canvasHeightPx * config.stage.groundYRatio;
  context.drawImage(state.images.get(card.candidate.current), sx, sy, asset.frameWidth, asset.frameHeight, x, ground - size * config.stage.originY, size, size);
  context.strokeStyle = "rgba(244,189,105,.45)"; context.beginPath(); context.moveTo(16, ground); context.lineTo(config.stage.canvasWidthPx - 16, ground); context.stroke();
}

function verdictFor(id) { return state.verdicts[id] || config.defaultVerdict; }

function refreshCard(card) {
  const verdict = verdictFor(card.candidate.id);
  card.badge.textContent = verdict;
  card.badge.className = `verdict ${verdict}`;
  card.buttons.forEach((button) => button.classList.toggle("is-active", button.dataset.verdict === verdict));
  card.root.hidden = state.filter !== "all" && card.candidate.category !== state.filter;
}

function updateSummary() {
  const counts = Object.fromEntries([...config.verdicts, "unreviewed"].map((key) => [key, 0]));
  config.candidates.forEach((entry) => { counts[verdictFor(entry.id)] += 1; });
  elements.summary.textContent = `${counts.accept} accepted · ${counts.maybe} maybe · ${counts.reject} rejected · ${counts.unreviewed} unreviewed`;
}

function setVerdict(card, verdict) {
  state.verdicts[card.candidate.id] = verdict;
  saveVerdicts(); refreshCard(card); updateSummary();
}

function createCard(candidate) {
  const root = elements.template.content.firstElementChild.cloneNode(true);
  root.dataset.category = candidate.category;
  root.querySelector("h2").textContent = candidate.name;
  root.querySelector(".role").textContent = candidate.role;
  const mode = root.querySelector(".mode"); mode.textContent = candidate.mode; mode.classList.add(candidate.mode);
  root.querySelector(".description").textContent = candidate.description;
  root.querySelector(".rationale").textContent = candidate.rationale;
  const image = root.querySelector("img"); image.src = candidate.thumbnail; image.alt = `${candidate.name}: ${candidate.description}`;
  candidate.risks.forEach((risk) => { const tag = document.createElement("span"); tag.textContent = risk; root.querySelector(".risks").append(tag); });
  const card = { candidate, root, canvas: root.querySelector("canvas"), badge: root.querySelector(".verdict"), buttons: [...root.querySelectorAll(".decisions button")] };
  card.buttons.forEach((button) => button.addEventListener("click", () => setVerdict(card, button.dataset.verdict)));
  elements.library.append(root); return card;
}

function buildFilters() {
  [{ id: "all", label: "All roles" }, ...config.categories].forEach((entry) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = entry.label; button.dataset.filter = entry.id;
    button.addEventListener("click", () => { state.filter = entry.id; [...elements.filters.children].forEach((item) => item.classList.toggle("is-active", item === button)); state.cards.forEach(refreshCard); });
    if (entry.id === "all") button.classList.add("is-active"); elements.filters.append(button);
  });
}

function render(now) {
  state.elapsedMs += Math.min(config.stage.maxDeltaMs, Math.max(0, now - state.lastMs)); state.lastMs = now;
  state.cards.filter((card) => !card.root.hidden).forEach(drawCurrent); requestAnimationFrame(render);
}

async function start() {
  loadVerdicts(); buildFilters();
  const imageEntries = await Promise.all(Object.entries(config.current).map(async ([id, asset]) => [id, await loadImage(asset.file)]));
  imageEntries.forEach(([id, image]) => state.images.set(id, image));
  state.cards = config.candidates.map(createCard); state.cards.forEach(refreshCard); updateSummary();
  elements.gameScale.addEventListener("change", () => state.cards.forEach(drawCurrent));
  elements.clear.addEventListener("click", () => { state.verdicts = {}; saveVerdicts(); state.cards.forEach(refreshCard); updateSummary(); });
  window.__MIXAMO_REPLACEMENT_REVIEW__.ready = true; requestAnimationFrame(render);
}

start().catch((error) => { console.error(error); elements.summary.textContent = `Review failed: ${error.message}`; });

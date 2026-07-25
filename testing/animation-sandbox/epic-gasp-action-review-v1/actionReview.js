import { SURVIVAL_RUN_REVIEW_CONFIG } from "../../../values/survivalRunReviewConfig.js";
import { EPIC_GASP_ANIMATION_CATALOG_CONFIG } from "../../../values/epicGaspAnimationCatalogConfig.js";
import { drawRunReviewCard } from "../ual-run-review-v1/runStageRenderer.js";

const config = SURVIVAL_RUN_REVIEW_CONFIG;
const catalog = EPIC_GASP_ANIMATION_CATALOG_CONFIG;
const candidates = catalog.candidates.map((candidate) => ({
  ...candidate,
  columns: catalog.display.columns,
  fps: candidate.fps ?? catalog.display.defaultFps,
  file: `${catalog.runtimeRoot}${candidate.sheet}`,
  displaySizePx: catalog.display.displaySizePx,
  originY: catalog.display.originY,
}));

const elements = {
  grid: document.querySelector("#candidate-grid"), play: document.querySelector("#play-toggle"), stepBack: document.querySelector("#step-back"), stepForward: document.querySelector("#step-forward"), restart: document.querySelector("#restart"), cadence: document.querySelector("#cadence-mode"), viewScale: document.querySelector("#view-scale"), flip: document.querySelector("#flip-facing"), guides: document.querySelector("#show-guides"), timeline: document.querySelector("#timeline"), selection: document.querySelector("#selection-summary"), status: document.querySelector("#load-status"),
};
const state = { playing: true, elapsedSeconds: 0, worldDistancePx: 0, cadenceMode: config.cadenceModes.native, viewScale: config.defaultViewScale, speedPxPerSec: 200, flipX: false, showGuides: true, selectedId: "traversal-08", lastTimestamp: performance.now(), cards: [] };

window.__EPIC_GASP_ACTION_REVIEW__ = { ready: false, actionCount: candidates.length, catalogCandidateCount: catalog.totalCandidateCount, noRuntimeWiring: catalog.noRuntimeWiring, getSnapshot: () => ({ ready: window.__EPIC_GASP_ACTION_REVIEW__.ready, actionCount: state.cards.length, selectedId: state.selectedId, noRuntimeWiring: catalog.noRuntimeWiring }) };

function loadImage(source) { return new Promise((resolve, reject) => { const image = new Image(); image.decoding = "async"; image.onload = () => resolve(image); image.onerror = () => reject(new Error(`Could not load ${source}`)); image.src = source; }); }

function selectCandidate(candidateId) {
  const selected = candidates.find((candidate) => candidate.id === candidateId);
  if (!selected) return;
  state.selectedId = selected.id;
  for (const card of state.cards) { const isSelected = card.candidate.id === selected.id; card.article.classList.toggle("is-selected", isSelected); card.chooseButton.setAttribute("aria-pressed", String(isSelected)); }
  elements.selection.textContent = `${selected.label} · ${selected.group.toLowerCase()} · review only on current Survival character`;
}

function createCard(candidate, image) {
  const article = document.createElement("article");
  article.className = "candidate-card";
  article.dataset.candidate = candidate.id;
  article.dataset.group = candidate.group;
  article.dataset.placeholder = String(candidate.placeholder);
  article.innerHTML = `<header class="candidate-head"><div><p class="option-label">${candidate.option}</p><h2>${candidate.label}</h2></div><span class="badge">${candidate.badge}</span></header><div class="stage-wrap"><canvas class="stage" aria-label="${candidate.label} animated on the current Survival character"></canvas><span class="stage-caption" data-role="frame">frame 1 / ${candidate.frameCount}</span></div><div class="candidate-copy"><p>${candidate.summary}</p><p class="evidence">${candidate.evidence}${candidate.placeholder ? " · PLACEHOLDER" : ""}</p></div><div class="metric-grid"><div class="metric"><span>Source</span><strong>${candidate.sourceClip}</strong></div><div class="metric"><span>Native clip</span><strong>${(candidate.frameCount / candidate.fps).toFixed(2)}s</strong></div><div class="metric"><span>Playback</span><strong data-role="time-scale">1.00× native</strong></div></div><button class="choose-button" type="button">Focus this action</button>`;
  const card = { candidate, metadata: candidate, image, article, canvas: article.querySelector("canvas"), frameLabel: article.querySelector('[data-role="frame"]'), timeScaleLabel: article.querySelector('[data-role="time-scale"]'), chooseButton: article.querySelector(".choose-button") };
  card.chooseButton.addEventListener("click", () => selectCandidate(candidate.id));
  elements.grid.append(article);
  return card;
}

function render(timestamp) {
  const deltaSeconds = Math.min(0.1, Math.max(0, (timestamp - state.lastTimestamp) / 1000));
  state.lastTimestamp = timestamp;
  if (state.playing) state.elapsedSeconds += deltaSeconds;
  for (const card of state.cards) drawRunReviewCard(card, state);
  if (state.playing) elements.timeline.value = String(Math.round((state.elapsedSeconds * 1000) % config.inspection.timelineDurationMs));
  requestAnimationFrame(render);
}

function updatePlayControl() { elements.play.textContent = state.playing ? "Pause" : "Play"; }
function pauseAndStep(direction) { state.playing = false; state.elapsedSeconds = Math.max(0, state.elapsedSeconds + direction * config.inspection.stepDurationSeconds); elements.timeline.value = String(Math.round((state.elapsedSeconds * 1000) % config.inspection.timelineDurationMs)); updatePlayControl(); }

function wireControls() {
  elements.play.addEventListener("click", () => { state.playing = !state.playing; state.lastTimestamp = performance.now(); updatePlayControl(); });
  elements.stepBack.addEventListener("click", () => pauseAndStep(-1)); elements.stepForward.addEventListener("click", () => pauseAndStep(1));
  elements.restart.addEventListener("click", () => { state.elapsedSeconds = 0; elements.timeline.value = "0"; });
  elements.cadence.addEventListener("change", () => { state.cadenceMode = elements.cadence.value; }); elements.viewScale.addEventListener("change", () => { state.viewScale = Number(elements.viewScale.value); });
  elements.flip.addEventListener("change", () => { state.flipX = elements.flip.checked; }); elements.guides.addEventListener("change", () => { state.showGuides = elements.guides.checked; });
  elements.timeline.addEventListener("input", () => { state.playing = false; state.elapsedSeconds = Number(elements.timeline.value) / 1000; updatePlayControl(); }); updatePlayControl();
}

async function start() {
  wireControls();
  const imageEntries = await Promise.all(candidates.map(async (candidate) => ({ candidate, image: await loadImage(candidate.file) })));
  state.cards = imageEntries.map(({ candidate, image }) => createCard(candidate, image));
  selectCandidate("traversal-08");
  elements.status.textContent = `Ready · ${candidates.length} animation candidates · current Survival character runtime sheets · review only`;
  window.__EPIC_GASP_ACTION_REVIEW__.ready = true;
  requestAnimationFrame(render);
}

start().catch((error) => { console.error(error); elements.status.textContent = `Review failed: ${error.message}`; elements.status.style.color = "#ff786f"; });

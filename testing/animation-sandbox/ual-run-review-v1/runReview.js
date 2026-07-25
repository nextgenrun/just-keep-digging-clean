import { PLAYER_STATS_CONFIG } from "../../../values/playerStats.js";
import { SURVIVAL_RUN_REVIEW_CONFIG } from "../../../values/survivalRunReviewConfig.js";
import { drawRunReviewCard } from "./runStageRenderer.js";

const config = SURVIVAL_RUN_REVIEW_CONFIG;
const elements = {
  grid: document.querySelector("#candidate-grid"),
  play: document.querySelector("#play-toggle"),
  stepBack: document.querySelector("#step-back"),
  stepForward: document.querySelector("#step-forward"),
  restart: document.querySelector("#restart"),
  cadence: document.querySelector("#cadence-mode"),
  viewScale: document.querySelector("#view-scale"),
  speed: document.querySelector("#speed"),
  speedValue: document.querySelector("#speed-value"),
  flip: document.querySelector("#flip-facing"),
  guides: document.querySelector("#show-guides"),
  timeline: document.querySelector("#timeline"),
  selection: document.querySelector("#selection-summary"),
  status: document.querySelector("#load-status"),
};
const state = {
  playing: true,
  elapsedSeconds: 0,
  worldDistancePx: 0,
  cadenceMode: config.defaultCadenceMode,
  viewScale: config.defaultViewScale,
  speedPxPerSec: PLAYER_STATS_CONFIG.walkSpeedPxPerSec,
  flipX: false,
  showGuides: true,
  selectedId: null,
  lastTimestamp: performance.now(),
  cards: [],
};

window.__UAL_RUN_REVIEW__ = {
  ready: false,
  candidateCount: 0,
  getSnapshot: () => ({
    ready: window.__UAL_RUN_REVIEW__.ready,
    candidateCount: state.cards.length,
    cadenceMode: state.cadenceMode,
    viewScale: state.viewScale,
    speedPxPerSec: state.speedPxPerSec,
    selectedId: state.selectedId,
  }),
};

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${source}`));
    image.src = source;
  });
}

function createCard(candidate, metadata, image) {
  const article = document.createElement("article");
  article.className = "candidate-card";
  article.dataset.candidate = candidate.id;
  article.dataset.tone = candidate.tone;
  article.dataset.reviewStatus = candidate.reviewStatus;
  const reviewState = candidate.reviewStatus === "rejected" ? "REJECTED · " : candidate.reviewStatus === "selected" ? "SELECTED · " : "";
  article.innerHTML = `
    <header class="candidate-head"><div><p class="option-label">Option ${candidate.option}</p><h2>${candidate.label}</h2></div><span class="badge">${reviewState}${candidate.badge}</span></header>
    <div class="stage-wrap"><canvas class="stage" aria-label="${candidate.label} run candidate animated at the selected cadence"></canvas><span class="stage-caption" data-role="frame">frame 1 / ${metadata.frameCount}</span></div>
    <div class="candidate-copy"><p>${candidate.summary}</p><p class="evidence">${candidate.evidence}</p></div>
    <div class="metric-grid"><div class="metric"><span>Source</span><strong>${candidate.sourceClip}</strong></div><div class="metric"><span>Native loop</span><strong>${(candidate.frameCount / candidate.fps).toFixed(2)}s</strong></div><div class="metric"><span>Playback</span><strong data-role="time-scale">1.00×</strong></div></div>
    <button class="choose-button" type="button" ${candidate.reviewStatus === "rejected" ? "disabled" : ""}>${candidate.reviewStatus === "rejected" ? "Rejected" : `Choose option ${candidate.option}`}</button>`;
  const card = {
    candidate,
    metadata,
    image,
    article,
    canvas: article.querySelector("canvas"),
    frameLabel: article.querySelector('[data-role="frame"]'),
    timeScaleLabel: article.querySelector('[data-role="time-scale"]'),
    chooseButton: article.querySelector(".choose-button"),
  };
  card.chooseButton.addEventListener("click", () => selectCandidate(candidate.id));
  elements.grid.append(article);
  return card;
}

function render(timestamp) {
  const deltaSeconds = Math.min(0.1, Math.max(0, (timestamp - state.lastTimestamp) / 1000));
  state.lastTimestamp = timestamp;
  if (state.playing) {
    state.elapsedSeconds += deltaSeconds;
    state.worldDistancePx += deltaSeconds * state.speedPxPerSec;
  }
  for (const card of state.cards) drawRunReviewCard(card, state);
  if (state.playing) elements.timeline.value = String(Math.round((state.elapsedSeconds * 1000) % config.inspection.timelineDurationMs));
  requestAnimationFrame(render);
}

function updatePlayControl() {
  elements.play.textContent = state.playing ? "Pause" : "Play";
}

function pauseAndStep(direction) {
  state.playing = false;
  state.elapsedSeconds = Math.max(0, state.elapsedSeconds + direction * config.inspection.stepDurationSeconds);
  state.worldDistancePx = Math.max(0, state.worldDistancePx + direction * state.speedPxPerSec * config.inspection.stepDurationSeconds);
  elements.timeline.value = String(Math.round((state.elapsedSeconds * 1000) % config.inspection.timelineDurationMs));
  updatePlayControl();
}

function selectCandidate(candidateId) {
  const selected = config.candidates.find((candidate) => candidate.id === candidateId);
  if (!selected) return;
  state.selectedId = selected.id;
  for (const card of state.cards) {
    const isSelected = card.candidate.id === selected.id;
    card.article.classList.toggle("is-selected", isSelected);
    card.chooseButton.setAttribute("aria-pressed", String(isSelected));
  }
  elements.selection.textContent = `Option ${selected.option} · ${selected.label} · review candidate`;
}

function wireControls() {
  const speedConfig = config.speedControl;
  elements.speed.min = String(speedConfig.minimumPxPerSec);
  elements.speed.max = String(speedConfig.maximumPxPerSec);
  elements.speed.step = String(speedConfig.stepPxPerSec);
  elements.speed.value = String(state.speedPxPerSec);
  elements.cadence.value = state.cadenceMode;
  elements.viewScale.value = String(state.viewScale);
  elements.play.addEventListener("click", () => { state.playing = !state.playing; state.lastTimestamp = performance.now(); updatePlayControl(); });
  elements.stepBack.addEventListener("click", () => pauseAndStep(-1));
  elements.stepForward.addEventListener("click", () => pauseAndStep(1));
  elements.restart.addEventListener("click", () => { state.elapsedSeconds = 0; state.worldDistancePx = 0; elements.timeline.value = "0"; });
  elements.cadence.addEventListener("change", () => { state.cadenceMode = elements.cadence.value; });
  elements.viewScale.addEventListener("change", () => { state.viewScale = Number(elements.viewScale.value); });
  elements.speed.addEventListener("input", () => { state.speedPxPerSec = Number(elements.speed.value); elements.speedValue.textContent = `${state.speedPxPerSec} px/s`; });
  elements.flip.addEventListener("change", () => { state.flipX = elements.flip.checked; });
  elements.guides.addEventListener("change", () => { state.showGuides = elements.guides.checked; });
  elements.timeline.addEventListener("input", () => { state.playing = false; state.elapsedSeconds = Number(elements.timeline.value) / 1000; state.worldDistancePx = state.elapsedSeconds * state.speedPxPerSec; updatePlayControl(); });
  updatePlayControl();
}

async function start() {
  wireControls();
  const imageEntries = await Promise.all(config.candidates.map(async (candidate) => {
    const image = await loadImage(candidate.file);
    return { candidate, metadata: candidate, image };
  }));
  state.cards = imageEntries.map(({ candidate, metadata, image }) => createCard(candidate, metadata, image));
  selectCandidate("ual-jog");
  elements.status.textContent = "Ready · Compact UAL jog selected · five current-character runtime candidates";
  window.__UAL_RUN_REVIEW__.ready = true;
  window.__UAL_RUN_REVIEW__.candidateCount = state.cards.length;
  requestAnimationFrame(render);
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = `Review failed: ${error.message}`;
  elements.status.style.color = "#ff786f";
});

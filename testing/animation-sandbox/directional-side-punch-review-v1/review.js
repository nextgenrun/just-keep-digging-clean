import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from "../../../values/playerAssetProfiles.js";
import { DIRECTIONAL_SIDE_PUNCH_REVIEW as config } from "../../../values/directionalSidePunchReview.js";

const profile = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
const elements = {
  grid: document.querySelector("#candidate-grid"), play: document.querySelector("#play-toggle"), restart: document.querySelector("#restart"),
  zoom: document.querySelector("#zoom"), flip: document.querySelector("#flip"), status: document.querySelector("#status"), selection: document.querySelector("#selection-summary"),
};
const state = { playing: true, elapsedMs: 0, lastTimestamp: performance.now(), zoom: 1, flipX: true, selectedId: null, images: new Map(), cards: [] };

window.__DIRECTIONAL_SIDE_PUNCH_REVIEW__ = {
  ready: false,
  productionChanged: config.productionChanged,
  getSnapshot: () => ({ selectedId: state.selectedId, productionChanged: config.productionChanged }),
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

function initialChoice() {
  const query = new URLSearchParams(window.location.search).get(config.selectionQueryKey);
  if (config.candidates.some((entry) => entry.id === query)) return query;
  try { return window.localStorage.getItem(config.selectionStorageKey) || config.defaultCandidateId; } catch { return config.defaultCandidateId; }
}

function createCard(candidate) {
  const article = document.createElement("article");
  article.className = "candidate";
  article.dataset.candidate = candidate.id;
  article.innerHTML = `
    <header><div><p>Option ${candidate.option}</p><h2>${candidate.label}</h2></div><span class="target">${candidate.targetLabel}</span></header>
    <div class="stage-wrap"><canvas class="stage" aria-label="${candidate.label} animated review"></canvas><span class="frame"></span></div>
    <p class="summary">${candidate.summary}</p>
    <small class="source">Approved Survivor skin · Punch Cross + isolated torso layer</small>
    <button class="choose" type="button">Mark option ${candidate.option} for review</button>
  `;
  const card = { candidate, article, canvas: article.querySelector("canvas"), frame: article.querySelector(".frame"), choose: article.querySelector("button") };
  card.choose.addEventListener("click", () => selectCandidate(candidate.id));
  elements.grid.append(article);
  return card;
}

function selectCandidate(id) {
  const candidate = config.candidates.find((entry) => entry.id === id);
  if (!candidate) return;
  state.selectedId = id;
  state.cards.forEach((card) => {
    const selected = card.candidate.id === id;
    card.article.classList.toggle("is-selected", selected);
    card.choose.textContent = selected ? `Selected · option ${card.candidate.option}` : `Mark option ${card.candidate.option} for review`;
  });
  elements.selection.textContent = `Option ${candidate.option} · ${candidate.label}`;
  try { window.localStorage.setItem(config.selectionStorageKey, id); } catch { /* Session choice is sufficient. */ }
  const url = new URL(window.location.href);
  url.searchParams.set(config.selectionQueryKey, id);
  window.history.replaceState(null, "", url);
}

function resize(canvas) {
  const width = Math.max(config.stage.minimumCanvasWidthPx, canvas.clientWidth);
  const height = config.stage.canvasHeightPx;
  const ratio = Math.min(window.devicePixelRatio || 1, config.stage.maxDevicePixelRatio);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { context, width, height };
}

function drawStage(context, width, height, candidate, frame) {
  const tile = config.stage.tileSizePx * state.zoom;
  const groundY = height * config.stage.groundYRatio;
  const actorX = width * config.stage.actorXRatio;
  const targetX = width * config.stage.targetXRatio;
  const targetBottom = groundY - candidate.targetHeightTiles * tile;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#10232a"); gradient.addColorStop(1, "#070e12");
  context.fillStyle = gradient; context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(130,188,184,.13)"; context.lineWidth = 1;
  for (let x = targetX % tile; x < width; x += tile) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = groundY; y > 0; y -= tile) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.fillStyle = "#18252a"; context.fillRect(0, groundY, width, height - groundY);
  context.strokeStyle = "rgba(244,189,105,.7)"; context.beginPath(); context.moveTo(0, groundY); context.lineTo(width, groundY); context.stroke();
  const impact = frame >= candidate.impactFrame;
  context.fillStyle = impact ? "rgba(244,189,105,.64)" : "rgba(88,119,116,.48)";
  context.fillRect(targetX - tile / 2, targetBottom - tile, tile, tile);
  context.strokeStyle = impact ? "#f4bd69" : "rgba(163,208,202,.5)"; context.lineWidth = impact ? 3 : 1;
  context.strokeRect(targetX - tile / 2, targetBottom - tile, tile, tile);
  return { groundY, actorX };
}

function drawCard(card) {
  const { context, width, height } = resize(card.canvas);
  const candidate = card.candidate;
  const frame = Math.min(candidate.frameCount - 1, Math.floor((state.elapsedMs / 1000) * candidate.fps) % candidate.frameCount);
  const { groundY, actorX } = drawStage(context, width, height, candidate, frame);
  const size = config.stage.displaySizePx * state.zoom;
  const image = state.images.get(candidate.id);
  const sourceX = (frame % candidate.columns) * 256;
  const sourceY = Math.floor(frame / candidate.columns) * 256;
  context.save();
  if (state.flipX) { context.translate(actorX * 2, 0); context.scale(-1, 1); }
  context.drawImage(image, sourceX, sourceY, 256, 256, actorX - size * profile.visualOriginX, groundY - size * profile.visualOriginY, size, size);
  context.restore();
  const bodyWidth = profile.playerBodyWidthPx * state.zoom;
  const bodyHeight = profile.playerBodyHeightPx * state.zoom;
  context.strokeStyle = "rgba(255,121,112,.8)"; context.strokeRect(actorX - bodyWidth / 2, groundY - bodyHeight, bodyWidth, bodyHeight);
  card.frame.textContent = `${candidate.targetLabel} · frame ${frame + 1}/${candidate.frameCount}`;
}

function render(timestamp) {
  const delta = Math.min(100, Math.max(0, timestamp - state.lastTimestamp));
  state.lastTimestamp = timestamp;
  if (state.playing) state.elapsedMs += delta;
  state.cards.forEach(drawCard);
  requestAnimationFrame(render);
}

function wireControls() {
  elements.play.addEventListener("click", () => { state.playing = !state.playing; state.lastTimestamp = performance.now(); elements.play.textContent = state.playing ? "Pause" : "Play"; });
  elements.restart.addEventListener("click", () => { state.elapsedMs = 0; });
  elements.zoom.addEventListener("change", () => { state.zoom = Number(elements.zoom.value); });
  elements.flip.addEventListener("change", () => { state.flipX = elements.flip.checked; });
}

async function start() {
  wireControls();
  const images = await Promise.all(config.candidates.map(async (entry) => [entry.id, await loadImage(entry.file)]));
  images.forEach(([id, image]) => state.images.set(id, image));
  state.cards = config.candidates.map(createCard);
  selectCandidate(initialChoice());
  elements.status.textContent = "Ready · 3 real Punch Cross candidates · no production change";
  window.__DIRECTIONAL_SIDE_PUNCH_REVIEW__.ready = true;
  requestAnimationFrame(render);
}

start().catch((error) => { console.error(error); elements.status.textContent = `Review failed: ${error.message}`; });

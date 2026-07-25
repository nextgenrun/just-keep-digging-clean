import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE } from "../../../values/playerAssetProfiles.js";
import { SURVIVAL_SIDE_COMBO_REVIEW as config } from "../../../values/survivalSideComboReview.js";

const profile = SURVIVAL_UAL_PLAYER_ASSET_PROFILE;
const elements = {
  grid: document.querySelector("#candidate-grid"),
  play: document.querySelector("#play-toggle"),
  restart: document.querySelector("#restart"),
  zoom: document.querySelector("#zoom"),
  flip: document.querySelector("#flip"),
  status: document.querySelector("#status"),
  selection: document.querySelector("#selection-summary"),
};
const state = {
  playing: true,
  elapsedMs: 0,
  lastTimestamp: performance.now(),
  zoom: config.stage.zoomOptions[0],
  flipX: false,
  selectedId: null,
  images: new Map(),
  cards: [],
};

window.__SURVIVAL_SIDE_COMBO_REVIEW__ = {
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

function candidateFromStoredChoice() {
  const queryChoice = new URLSearchParams(window.location.search).get(config.selectionQueryKey);
  if (config.candidates.some((candidate) => candidate.id === queryChoice)) return queryChoice;
  try {
    const stored = window.localStorage.getItem(config.selectionStorageKey);
    return config.candidates.some((candidate) => candidate.id === stored) ? stored : config.defaultCandidateId;
  } catch {
    return config.defaultCandidateId;
  }
}

function createCard(candidate) {
  const article = document.createElement("article");
  article.className = "candidate";
  article.dataset.candidate = candidate.id;
  article.innerHTML = `
    <header><div><p>Option ${candidate.option}</p><h2>${candidate.label}</h2></div><span class="count">${candidate.sequence.length} hits</span></header>
    <div class="stage-wrap"><canvas class="stage" aria-label="${candidate.label} animated comparison"></canvas><span class="frame"></span></div>
    <p class="summary">${candidate.summary}</p>
    <div class="sequence">${candidate.sequence.map((entry) => `<span>${entry.label}</span>`).join("")}</div>
    <small class="source"></small>
    <button class="choose" type="button">Use option ${candidate.option} for review</button>
  `;
  const card = {
    candidate,
    article,
    canvas: article.querySelector("canvas"),
    frame: article.querySelector(".frame"),
    source: article.querySelector(".source"),
    choose: article.querySelector("button"),
  };
  card.choose.addEventListener("click", () => selectCandidate(candidate.id));
  elements.grid.append(article);
  return card;
}

function selectCandidate(candidateId) {
  const selected = config.candidates.find((candidate) => candidate.id === candidateId);
  if (!selected) return;
  state.selectedId = candidateId;
  state.cards.forEach((card) => {
    const active = card.candidate.id === candidateId;
    card.article.classList.toggle("is-selected", active);
    card.choose.textContent = active ? `Selected · option ${card.candidate.option}` : `Use option ${card.candidate.option} for review`;
  });
  elements.selection.textContent = `Option ${selected.option} · ${selected.label}`;
  try { window.localStorage.setItem(config.selectionStorageKey, candidateId); } catch { /* Session selection is enough. */ }
  const url = new URL(window.location.href);
  url.searchParams.set(config.selectionQueryKey, candidateId);
  window.history.replaceState(null, "", url);
}

function resolvePose(candidate, elapsedMs) {
  const durationFor = (entry) => {
    const asset = config.assets[entry.assetId];
    return (asset.frameCount / asset.fps) * 1000 + config.stage.actionGapMs;
  };
  const totalDuration = candidate.sequence.reduce((total, entry) => total + durationFor(entry), 0);
  let position = elapsedMs % totalDuration;
  for (let index = 0; index < candidate.sequence.length; index += 1) {
    const entry = candidate.sequence[index];
    const asset = config.assets[entry.assetId];
    const actionMs = (asset.frameCount / asset.fps) * 1000;
    if (position < actionMs || index === candidate.sequence.length - 1) {
      const frame = Math.min(asset.frameCount - 1, Math.floor((position / 1000) * asset.fps));
      return { asset, entry, index, frame, impact: frame >= asset.impactFrame };
    }
    position -= actionMs + config.stage.actionGapMs;
  }
  return null;
}

function resizeCanvas(canvas) {
  const width = Math.max(config.stage.minimumCanvasWidthPx, canvas.clientWidth);
  const height = config.stage.canvasHeightPx;
  const ratio = Math.min(window.devicePixelRatio || 1, config.stage.maxDevicePixelRatio);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { context, width, height };
}

function drawBackground(context, width, height, groundY, targetX) {
  const tile = config.stage.tileSizePx * state.zoom;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#10232a");
  gradient.addColorStop(1, "#070e12");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(130, 188, 184, 0.13)";
  context.lineWidth = 1;
  for (let x = targetX % tile; x < width; x += tile) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = groundY; y > 0; y -= tile) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.fillStyle = "#18252a";
  context.fillRect(0, groundY, width, height - groundY);
  context.strokeStyle = "rgba(244, 189, 105, 0.7)";
  context.beginPath(); context.moveTo(0, groundY); context.lineTo(width, groundY); context.stroke();
}

function drawCard(card) {
  const pose = resolvePose(card.candidate, state.elapsedMs);
  const { context, width, height } = resizeCanvas(card.canvas);
  const groundY = height * config.stage.groundYRatio;
  const actorX = width * config.stage.actorXRatio;
  const targetX = width * config.stage.targetXRatio;
  drawBackground(context, width, height, groundY, targetX);
  const targetSize = config.stage.tileSizePx * state.zoom;
  context.fillStyle = pose.impact ? "rgba(244, 189, 105, 0.64)" : "rgba(88, 119, 116, 0.48)";
  context.fillRect(targetX - targetSize / 2, groundY - targetSize, targetSize, targetSize);
  context.strokeStyle = pose.impact ? "#f4bd69" : "rgba(163, 208, 202, 0.5)";
  context.lineWidth = pose.impact ? 3 : 1;
  context.strokeRect(targetX - targetSize / 2, groundY - targetSize, targetSize, targetSize);

  const size = config.stage.displaySizePx * state.zoom;
  const image = state.images.get(pose.entry.assetId);
  const sourceX = (pose.frame % pose.asset.columns) * pose.asset.frameWidth;
  const sourceY = Math.floor(pose.frame / pose.asset.columns) * pose.asset.frameHeight;
  context.save();
  if (state.flipX) { context.translate(actorX * 2, 0); context.scale(-1, 1); }
  context.drawImage(
    image, sourceX, sourceY, pose.asset.frameWidth, pose.asset.frameHeight,
    actorX - size * profile.visualOriginX, groundY - size * profile.visualOriginY, size, size,
  );
  context.restore();

  const bodyWidth = profile.playerBodyWidthPx * state.zoom;
  const bodyHeight = profile.playerBodyHeightPx * state.zoom;
  context.fillStyle = "rgba(255, 121, 112, 0.08)";
  context.strokeStyle = "rgba(255, 121, 112, 0.8)";
  context.strokeRect(actorX - bodyWidth / 2, groundY - bodyHeight, bodyWidth, bodyHeight);
  card.frame.textContent = `${pose.entry.label} · frame ${pose.frame + 1}/${pose.asset.frameCount}`;
  card.source.textContent = `${pose.asset.skin} · ${pose.asset.source}`;
}

function render(timestamp) {
  const delta = Math.min(100, Math.max(0, timestamp - state.lastTimestamp));
  state.lastTimestamp = timestamp;
  if (state.playing) state.elapsedMs += delta;
  state.cards.forEach(drawCard);
  requestAnimationFrame(render);
}

function wireControls() {
  elements.play.addEventListener("click", () => {
    state.playing = !state.playing;
    state.lastTimestamp = performance.now();
    elements.play.textContent = state.playing ? "Pause" : "Play";
  });
  elements.restart.addEventListener("click", () => { state.elapsedMs = 0; });
  elements.zoom.addEventListener("change", () => { state.zoom = Number(elements.zoom.value); });
  elements.flip.addEventListener("change", () => { state.flipX = elements.flip.checked; });
}

async function start() {
  wireControls();
  const imageEntries = await Promise.all(Object.entries(config.assets).map(async ([id, entry]) => [id, await loadImage(entry.file)]));
  imageEntries.forEach(([id, image]) => state.images.set(id, image));
  state.cards = config.candidates.map(createCard);
  selectCandidate(candidateFromStoredChoice());
  elements.status.textContent = "Ready · 4 fist-only candidates · no production change";
  window.__SURVIVAL_SIDE_COMBO_REVIEW__.ready = true;
  requestAnimationFrame(render);
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = `Review failed: ${error.message}`;
});

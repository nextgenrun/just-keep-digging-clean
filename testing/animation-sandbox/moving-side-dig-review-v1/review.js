const elements = {
  grid: document.querySelector("#candidate-grid"),
  play: document.querySelector("#play-toggle"),
  restart: document.querySelector("#restart"),
  speed: document.querySelector("#speed"),
  zoom: document.querySelector("#zoom"),
  flip: document.querySelector("#flip"),
  scrub: document.querySelector("#scrub"),
  status: document.querySelector("#status"),
  selection: document.querySelector("#selection-summary"),
};
const state = {
  config: null,
  playing: true,
  elapsedMs: 0,
  lastTimestamp: performance.now(),
  speed: 1,
  zoom: 1,
  flipX: false,
  frame: 0,
  selectedId: null,
  images: new Map(),
  cards: [],
};

window.__MOVING_SIDE_DIG_REVIEW__ = {
  ready: false,
  reviewOnly: true,
  productionChanged: false,
  getSnapshot: () => ({
    ready: window.__MOVING_SIDE_DIG_REVIEW__.ready,
    reviewOnly: state.config?.reviewOnly === true,
    productionChanged: state.config?.productionChanged === true,
    selectedId: state.selectedId,
    frame: state.frame,
    candidateCount: state.cards.length,
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

function fillOptions(select, options, suffix) {
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${value}${suffix}`;
    select.append(option);
  });
}

function initialChoice() {
  const { config } = state;
  const query = new URLSearchParams(window.location.search).get(config.selectionQueryKey);
  if (config.candidates.some((entry) => entry.id === query)) return query;
  try {
    const stored = window.localStorage.getItem(config.selectionStorageKey);
    if (config.candidates.some((entry) => entry.id === stored)) return stored;
  } catch { /* Browser-local selection is optional. */ }
  return config.defaultCandidateId;
}

function createCard(candidate) {
  const article = document.createElement("article");
  article.className = `candidate${candidate.recommended ? " is-recommended" : ""}`;
  article.dataset.candidate = candidate.id;
  article.innerHTML = `
    <header><div><p>Option ${candidate.option}</p><h2>${candidate.label}</h2></div><span class="badge">${candidate.recommended ? "Recommended" : candidate.shortLabel}</span></header>
    <div class="stage-wrap"><canvas class="stage" aria-label="${candidate.label} moving-side-dig animation"></canvas><span class="frame"></span></div>
    <p class="summary">${candidate.summary}</p>
    <small class="technical">${candidate.lowerBodyPolicy === "continuous-run" ? "Jog owns pelvis + legs · punch torso is marker-aligned" : "Standing punch owns the full body · moving ground exposes foot slide"}</small>
    <button class="choose" type="button">Mark option ${candidate.option} for review</button>
  `;
  const card = {
    candidate,
    article,
    canvas: article.querySelector("canvas"),
    frameLabel: article.querySelector(".frame"),
    choose: article.querySelector(".choose"),
  };
  card.choose.addEventListener("click", () => selectCandidate(candidate.id));
  elements.grid.append(article);
  return card;
}

function selectCandidate(id) {
  const candidate = state.config.candidates.find((entry) => entry.id === id);
  if (!candidate) return;
  state.selectedId = id;
  state.cards.forEach((card) => {
    const active = card.candidate.id === id;
    card.article.classList.toggle("is-selected", active);
    card.choose.textContent = active
      ? `Selected · option ${card.candidate.option}`
      : `Mark option ${card.candidate.option} for review`;
  });
  elements.selection.textContent = `Option ${candidate.option} · ${candidate.label}`;
  try { window.localStorage.setItem(state.config.selectionStorageKey, id); } catch { /* Session state is sufficient. */ }
  const url = new URL(window.location.href);
  url.searchParams.set(state.config.selectionQueryKey, id);
  window.history.replaceState(null, "", url);
}

function resizeCanvas(canvas) {
  const stage = state.config.stage;
  const width = Math.max(300, canvas.clientWidth);
  const height = 300;
  const ratio = Math.min(window.devicePixelRatio || 1, stage.maxDevicePixelRatio);
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

function drawStage(context, width, height, impact) {
  const stage = state.config.stage;
  const scale = stage.reviewScale * state.zoom;
  const tile = stage.tileSizePx * scale;
  const groundY = height * stage.groundYRatio;
  const actorX = width * stage.actorXRatio;
  const targetX = actorX
    + stage.bodyWidthPx * scale / 2
    + tile / 2
    + stage.targetGapPx * scale;
  const seconds = state.frame / (state.config.build.fps * state.config.build.previewTimeScale);
  const scroll = seconds * stage.referenceSpeedPxPerSec * scale;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#10242b");
  gradient.addColorStop(1, "#070d11");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(129,188,184,.14)";
  context.lineWidth = 1;
  for (let x = -scroll % tile; x < width; x += tile) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  context.fillStyle = "#18252a";
  context.fillRect(0, groundY, width, height - groundY);
  context.strokeStyle = "rgba(73,104,106,.38)";
  for (let x = -(scroll % (tile / 2)); x < width; x += tile / 2) {
    context.beginPath(); context.moveTo(x, groundY); context.lineTo(x, height); context.stroke();
  }
  context.fillStyle = "rgba(119,151,148,.38)";
  for (let x = -(scroll % tile); x < width; x += tile) {
    context.fillRect(x + tile * .22, groundY + 14, 8, 3);
    context.fillRect(x + tile * .66, groundY + 34, 11, 3);
  }
  context.strokeStyle = "rgba(244,189,105,.7)";
  context.beginPath(); context.moveTo(0, groundY); context.lineTo(width, groundY); context.stroke();
  context.fillStyle = impact ? "rgba(244,189,105,.62)" : "rgba(83,113,111,.5)";
  context.fillRect(targetX - tile / 2, groundY - tile, tile, tile);
  context.strokeStyle = impact ? "#f4bd69" : "rgba(164,208,203,.52)";
  context.lineWidth = impact ? 3 : 1;
  context.strokeRect(targetX - tile / 2, groundY - tile, tile, tile);
  return { scale, groundY, actorX };
}

function drawCard(card) {
  const { context, width, height } = resizeCanvas(card.canvas);
  const build = state.config.build;
  const impact = build.contactFrames.includes(state.frame);
  const { scale, groundY, actorX } = drawStage(context, width, height, impact);
  const image = state.images.get(card.candidate.id);
  const sourceX = (state.frame % build.columns) * build.frameWidth;
  const sourceY = Math.floor(state.frame / build.columns) * build.frameHeight;
  const size = card.candidate.displaySizePx * scale;
  context.save();
  if (state.flipX) { context.translate(actorX * 2, 0); context.scale(-1, 1); }
  context.drawImage(
    image, sourceX, sourceY, build.frameWidth, build.frameHeight,
    actorX - size * state.config.stage.visualOriginX,
    groundY - size * state.config.stage.visualOriginY,
    size, size,
  );
  context.restore();
  const bodyWidth = state.config.stage.bodyWidthPx * scale;
  const bodyHeight = state.config.stage.bodyHeightPx * scale;
  context.strokeStyle = "rgba(255,121,112,.82)";
  context.strokeRect(actorX - bodyWidth / 2, groundY - bodyHeight, bodyWidth, bodyHeight);
  card.frameLabel.textContent = `frame ${state.frame + 1}/${build.frameCount}${impact ? " · contact" : ""}`;
}

function render(timestamp) {
  const delta = Math.min(100, Math.max(0, timestamp - state.lastTimestamp));
  state.lastTimestamp = timestamp;
  if (state.playing) {
    state.elapsedMs += delta * state.speed;
    const build = state.config.build;
    state.frame = Math.floor(state.elapsedMs / 1000 * build.fps * build.previewTimeScale) % build.frameCount;
    elements.scrub.value = state.frame;
  }
  state.cards.forEach(drawCard);
  requestAnimationFrame(render);
}

function wireControls() {
  const { build, stage } = state.config;
  fillOptions(elements.speed, stage.speedOptions, "×");
  fillOptions(elements.zoom, stage.zoomOptions, "×");
  elements.speed.value = "1";
  elements.zoom.value = "1";
  elements.scrub.min = 0;
  elements.scrub.max = build.frameCount - 1;
  elements.play.addEventListener("click", () => {
    state.playing = !state.playing;
    state.lastTimestamp = performance.now();
    elements.play.textContent = state.playing ? "Pause" : "Play";
  });
  elements.restart.addEventListener("click", () => { state.elapsedMs = 0; state.frame = 0; });
  elements.speed.addEventListener("change", () => { state.speed = Number(elements.speed.value); });
  elements.zoom.addEventListener("change", () => { state.zoom = Number(elements.zoom.value); });
  elements.flip.addEventListener("change", () => { state.flipX = elements.flip.checked; });
  elements.scrub.addEventListener("input", () => {
    state.playing = false;
    elements.play.textContent = "Play";
    state.frame = Number(elements.scrub.value);
    state.elapsedMs = state.frame / (build.fps * build.previewTimeScale) * 1000;
  });
}

async function start() {
  state.config = await fetch("../../../values/movingSideDigReview.json").then((response) => response.json());
  if (!state.config.reviewOnly || state.config.productionChanged) throw new Error("Review guardrail failed");
  wireControls();
  const loaded = await Promise.all(state.config.candidates.map(async (candidate) => [
    candidate.id, await loadImage(candidate.sheet),
  ]));
  loaded.forEach(([id, image]) => state.images.set(id, image));
  state.cards = state.config.candidates.map(createCard);
  selectCandidate(initialChoice());
  elements.status.textContent = "Ready · synchronized production-frame comparison · no production change";
  window.__MOVING_SIDE_DIG_REVIEW__.ready = true;
  requestAnimationFrame(render);
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = `Review failed: ${error.message}`;
});

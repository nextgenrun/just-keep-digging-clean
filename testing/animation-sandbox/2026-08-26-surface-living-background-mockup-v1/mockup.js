import { SURFACE_LIVING_BACKGROUND_MOCKUP as CONFIG } from "./mockupConfig.js";
import {
  SURFACE_LIVING_PROFILE_COPY,
  SURFACE_LIVING_VARIANTS,
} from "./variantGalleryConfig.js";

const stage = document.querySelector("[data-world-frame]");
const still = document.querySelector("[data-still]");
const videos = [...document.querySelectorAll("[data-video]")];
const status = document.querySelector("[data-status]");
const toggle = document.querySelector("[data-action='toggle']");
const restart = document.querySelector("[data-action='restart']");
const variantList = document.querySelector("[data-variant-list]");
const activeNumber = document.querySelector("[data-active-number]");
const activeModel = document.querySelector("[data-active-model]");
const activeProfile = document.querySelector("[data-active-profile]");
const profileCopy = document.querySelector("[data-profile-copy]");

const cropHeight = CONFIG.source.surfaceYpx
  + CONFIG.source.tileSizePx * CONFIG.source.visibleDepthTiles;
stage.style.aspectRatio = `${CONFIG.source.widthPx} / ${cropHeight}`;
still.src = CONFIG.assets.still;

// Open on the lowest-drift candidate from the recorded browser QA pass.
let selected = SURFACE_LIVING_VARIANTS[4];
let activeIndex = 0;
let fadeStartedAt = null;
let animationFrame = 0;
let paused = false;
let ready = false;
let diagnostics = null;
let selectionToken = 0;

const smoothstep = value => value * value * (3 - 2 * value);
const activeVideo = () => videos[activeIndex];
const incomingVideo = () => videos[1 - activeIndex];

function setOpacity(video, value) {
  video.style.opacity = String(value);
  video.classList.toggle("is-active", value > 0.001);
}

function waitForMedia(video, eventName) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(video.error); };
    video.addEventListener(eventName, onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function safePlay(video) {
  try {
    await video.play();
    return true;
  } catch {
    status.textContent = "Candidate ready; press Replay soft loop to start it.";
    return false;
  }
}

function resetLoop() {
  cancelAnimationFrame(animationFrame);
  videos.forEach(video => {
    video.pause();
    video.currentTime = 0;
    setOpacity(video, 0);
  });
  activeIndex = 0;
  fadeStartedAt = null;
  setOpacity(activeVideo(), 1);
}

async function startLoop() {
  resetLoop();
  paused = false;
  toggle.textContent = "Pause motion";
  const playing = await safePlay(activeVideo());
  if (!playing) return;
  status.textContent = diagnostics
    ? formatDiagnosticStatus(diagnostics)
    : `${selected.modelLabel} · ${selected.profileLabel} · soft overlap active`;
  animationFrame = requestAnimationFrame(updateLoop);
}

function updateLoop(now) {
  if (paused) return;
  const current = activeVideo();
  const incoming = incomingVideo();
  const fadeSeconds = CONFIG.loop.crossfadeMs / 1000;
  const fadeAt = Math.max(0, current.duration - fadeSeconds - CONFIG.loop.endGuardSeconds);
  if (fadeStartedAt === null && current.currentTime >= fadeAt) {
    incoming.currentTime = CONFIG.loop.startGuardSeconds;
    setOpacity(incoming, 0);
    safePlay(incoming);
    fadeStartedAt = now;
  }
  if (fadeStartedAt !== null) {
    const progress = Math.min(1, (now - fadeStartedAt) / CONFIG.loop.crossfadeMs);
    const eased = smoothstep(progress);
    setOpacity(current, 1 - eased);
    setOpacity(incoming, eased);
    if (progress >= 1) {
      current.pause();
      setOpacity(current, 0);
      activeIndex = 1 - activeIndex;
      fadeStartedAt = null;
    }
  }
  animationFrame = requestAnimationFrame(updateLoop);
}

function seek(video, time) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    const onSeeked = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(video.error); };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = Math.max(0, Math.min(time, video.duration - 0.001));
  });
}

async function sampleFrame(video, time, canvas, context) {
  await seek(video, time);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height).data.slice();
}

function compareFrames(a, b) {
  let rgbDelta = 0;
  let lumaA = 0;
  let lumaB = 0;
  const pixels = a.length / 4;
  for (let index = 0; index < a.length; index += 4) {
    rgbDelta += Math.abs(a[index] - b[index]);
    rgbDelta += Math.abs(a[index + 1] - b[index + 1]);
    rgbDelta += Math.abs(a[index + 2] - b[index + 2]);
    lumaA += a[index] * 0.2126 + a[index + 1] * 0.7152 + a[index + 2] * 0.0722;
    lumaB += b[index] * 0.2126 + b[index + 1] * 0.7152 + b[index + 2] * 0.0722;
  }
  return { mae: rgbDelta / (pixels * 3), lumaDelta: Math.abs(lumaA - lumaB) / pixels };
}

async function measureLoop(src) {
  const probe = document.createElement("video");
  probe.muted = true;
  probe.preload = "auto";
  const metadataReady = waitForMedia(probe, "loadedmetadata");
  probe.src = src;
  probe.load();
  await metadataReady;
  const canvas = document.createElement("canvas");
  canvas.width = CONFIG.diagnostics.sampleWidthPx;
  canvas.height = CONFIG.diagnostics.sampleHeightPx;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const start = await sampleFrame(probe, CONFIG.loop.startGuardSeconds, canvas, context);
  const end = await sampleFrame(
    probe,
    probe.duration - CONFIG.loop.endGuardSeconds,
    canvas,
    context,
  );
  const seam = compareFrames(end, start);
  const result = {
    endpointMae: seam.mae,
    endpointLumaDelta: seam.lumaDelta,
    softCrossfadeMs: CONFIG.loop.crossfadeMs,
    warning: seam.mae > CONFIG.diagnostics.endpointMaeWarning
      || seam.lumaDelta > CONFIG.diagnostics.endpointLumaWarning,
  };
  probe.remove();
  return result;
}

function formatDiagnosticStatus(result) {
  const prefix = result.warning ? "Review seam" : "Endpoint match passes";
  return `${prefix} · frame Δ ${result.endpointMae.toFixed(2)} · luma Δ ${result.endpointLumaDelta.toFixed(2)} · ${result.softCrossfadeMs} ms overlap`;
}

function updateSelectionUi() {
  activeNumber.textContent = selected.id.slice(0, 2);
  activeModel.textContent = selected.modelLabel;
  activeProfile.textContent = selected.profileLabel;
  profileCopy.textContent = SURFACE_LIVING_PROFILE_COPY[selected.profileId];
  variantList.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.variantId === selected.id));
  });
}

async function selectVariant(variant) {
  if (!variant) return;
  const token = ++selectionToken;
  selected = variant;
  ready = false;
  diagnostics = null;
  resetLoop();
  updateSelectionUi();
  status.textContent = `Loading ${selected.id.slice(0, 2)} · ${selected.modelLabel}…`;
  stage.dataset.variantId = selected.id;
  stage.dataset.diagnostics = "";
  const mediaReady = videos.map(video => waitForMedia(video, "canplay"));
  videos.forEach(video => {
    video.src = selected.src;
    video.load();
  });
  try {
    await Promise.all(mediaReady);
    if (token !== selectionToken) return;
    diagnostics = await measureLoop(selected.src);
    if (token !== selectionToken) return;
    stage.dataset.diagnostics = JSON.stringify(diagnostics);
    ready = true;
    await startLoop();
  } catch (error) {
    if (token !== selectionToken) return;
    status.textContent = `Candidate unavailable: ${error?.message || "media error"}`;
    stage.dataset.diagnostics = JSON.stringify({ error: error?.message || "media error" });
  }
}

SURFACE_LIVING_VARIANTS.forEach(variant => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "variant-card";
  button.dataset.variantId = variant.id;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <span class="variant-number">${variant.id.slice(0, 2)}</span>
    <span class="variant-model">${variant.modelLabel}</span>
    <span class="variant-profile">${variant.profileLabel}</span>
  `;
  button.addEventListener("click", () => selectVariant(variant));
  variantList.append(button);
});

toggle.addEventListener("click", async () => {
  if (!ready) return;
  paused = !paused;
  if (paused) {
    cancelAnimationFrame(animationFrame);
    videos.forEach(video => video.pause());
    toggle.textContent = "Resume motion";
    status.textContent = "Motion paused on the current world frame.";
    return;
  }
  videos.forEach(video => {
    if (Number(video.style.opacity) > 0) safePlay(video);
  });
  toggle.textContent = "Pause motion";
  status.textContent = diagnostics ? formatDiagnosticStatus(diagnostics) : "Soft overlap active";
  animationFrame = requestAnimationFrame(updateLoop);
});

restart.addEventListener("click", startLoop);
document.addEventListener("keydown", event => {
  const digit = event.key === "0" ? 10 : Number(event.key);
  if (Number.isInteger(digit) && digit >= 1 && digit <= 10) {
    selectVariant(SURFACE_LIVING_VARIANTS[digit - 1]);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    videos.forEach(video => video.pause());
    cancelAnimationFrame(animationFrame);
  } else if (!paused && ready) {
    startLoop();
  }
});

window.surfaceLivingVariants = Object.freeze({
  getSnapshot: () => ({
    selected,
    ready,
    paused,
    activeIndex,
    diagnostics,
    currentTimes: videos.map(video => video.currentTime),
    opacities: videos.map(video => Number(video.style.opacity || 0)),
  }),
  select: id => selectVariant(SURFACE_LIVING_VARIANTS.find(item => item.id === id)),
});

updateSelectionUi();
selectVariant(selected);

import { SURFACE_BACKGROUND_VARIANTS as VARIANTS } from "./galleryConfig.js";

const video = document.querySelector("[data-video]");
const list = document.querySelector("[data-variant-list]");
const status = document.querySelector("[data-status]");
const toggle = document.querySelector("[data-action='toggle']");
const seamTest = document.querySelector("[data-action='seam']");
const activeId = document.querySelector("[data-active-id]");
const activeCopy = document.querySelector("[data-active-copy]");
const time = document.querySelector("[data-time]");
const progress = document.querySelector(".time-readout i");
const duration = document.querySelector("[data-duration]");
const drift = document.querySelector("[data-drift]");
const seam = document.querySelector("[data-seam]");

let selected = VARIANTS.find(variant => variant.recommended) || VARIANTS[0];
let previousTime = 0;
let completedWraps = 0;

function setStatus(copy = "") {
  status.textContent = copy || `Seedance 2.0 Mini · ${selected.name} · ${completedWraps} observed wrap${completedWraps === 1 ? "" : "s"}`;
}

async function play() {
  try {
    await video.play();
    toggle.textContent = "Pause motion";
    setStatus();
  } catch {
    toggle.textContent = "Play motion";
    setStatus("Candidate ready; press Play motion.");
  }
}

function updateUi() {
  activeId.textContent = selected.id;
  activeCopy.textContent = `${selected.name} · 18s cycle`;
  duration.textContent = `${selected.duration.toFixed(1)} seconds`;
  drift.textContent = `${selected.driftPx.toFixed(1)} px`;
  seam.textContent = `${selected.seamMae.toFixed(2)} frame Δ`;
  list.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.id === selected.id));
  });
}

function selectVariant(variant) {
  if (!variant) return;
  selected = variant;
  previousTime = 0;
  completedWraps = 0;
  video.pause();
  video.src = variant.src;
  video.load();
  updateUi();
  setStatus(`Loading ${variant.id} · ${variant.name}…`);
}

VARIANTS.forEach(variant => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "variant-card";
  button.dataset.id = variant.id;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<b>${variant.id}</b><span>${variant.name}</span><small>${variant.note}</small>${variant.recommended ? "<em>Recommended balance</em>" : ""}`;
  button.addEventListener("click", () => selectVariant(variant));
  list.append(button);
});

video.addEventListener("canplay", play);
video.addEventListener("timeupdate", () => {
  if (video.currentTime + 1 < previousTime) {
    completedWraps += 1;
    setStatus();
  }
  previousTime = video.currentTime;
  time.textContent = video.currentTime.toFixed(1);
  progress.style.setProperty("--progress", `${video.duration ? video.currentTime / video.duration * 100 : 0}%`);
});
video.addEventListener("error", () => {
  setStatus(`Media error: ${video.error?.message || "candidate unavailable"}`);
});
toggle.addEventListener("click", () => {
  if (video.paused) play();
  else {
    video.pause();
    toggle.textContent = "Resume motion";
    setStatus("Motion paused; static ground remains separate.");
  }
});
seamTest.addEventListener("click", () => {
  video.currentTime = Math.max(0, (video.duration || selected.duration) - 2.5);
  play();
  setStatus("Watching the final 2.5 seconds through the endless wrap…");
});
document.addEventListener("keydown", event => {
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < VARIANTS.length) {
    selectVariant(VARIANTS[index]);
  }
});

window.surfaceBackgroundLoopReview = Object.freeze({
  select: id => selectVariant(VARIANTS.find(variant => variant.id === id)),
  testSeam: () => seamTest.click(),
  snapshot: () => ({
    selected,
    currentTime: video.currentTime,
    duration: video.duration,
    paused: video.paused,
    readyState: video.readyState,
    completedWraps,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  }),
});

selectVariant(selected);

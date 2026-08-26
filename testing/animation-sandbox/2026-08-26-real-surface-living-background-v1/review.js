import { REAL_SURFACE_SEEDANCE_VARIANTS as VARIANTS } from "./galleryConfig.js";

const video = document.querySelector("[data-video]");
const list = document.querySelector("[data-variant-list]");
const status = document.querySelector("[data-status]");
const toggle = document.querySelector("[data-action='toggle']");
const replay = document.querySelector("[data-action='replay']");
const activeId = document.querySelector("[data-active-id]");
const activeCopy = document.querySelector("[data-active-copy]");
const upperMotion = document.querySelector("[data-upper-motion]");
const earthMotion = document.querySelector("[data-earth-motion]");
const seam = document.querySelector("[data-seam]");

let selected = VARIANTS[3];

function setStatus() {
  status.textContent = `${selected.model} · ${selected.motion} · seamless palindrome playback`;
}

async function play() {
  try {
    await video.play();
    toggle.textContent = "Pause motion";
    setStatus();
  } catch {
    toggle.textContent = "Play motion";
    status.textContent = "Candidate ready; press Play motion.";
  }
}

function updateUi() {
  activeId.textContent = selected.id;
  activeCopy.textContent = `${selected.model} · ${selected.motion}`;
  upperMotion.textContent = `${selected.upperMotion.toFixed(2)} frame Δ`;
  earthMotion.textContent = `${selected.earthMotion.toFixed(2)} frame Δ`;
  seam.textContent = `${selected.seamMae.toFixed(2)} frame Δ`;
  list.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.id === selected.id));
  });
}

function selectVariant(variant) {
  if (!variant) return;
  selected = variant;
  video.pause();
  video.src = variant.src;
  video.load();
  updateUi();
  status.textContent = `Loading ${variant.id} · ${variant.model}…`;
}

VARIANTS.forEach(variant => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "variant-card";
  button.dataset.id = variant.id;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<b>${variant.id}</b><span>${variant.model}</span><small>${variant.motion}</small>`;
  button.addEventListener("click", () => selectVariant(variant));
  list.append(button);
});

video.addEventListener("canplay", play);
video.addEventListener("error", () => {
  status.textContent = `Media error: ${video.error?.message || "candidate unavailable"}`;
});
toggle.addEventListener("click", () => {
  if (video.paused) play();
  else {
    video.pause();
    toggle.textContent = "Resume motion";
    status.textContent = "Motion paused on the current real-world frame.";
  }
});
replay.addEventListener("click", () => {
  video.currentTime = 0;
  play();
});
document.addEventListener("keydown", event => {
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < VARIANTS.length) {
    selectVariant(VARIANTS[index]);
  }
});

window.realSurfaceSeedanceReview = Object.freeze({
  select: id => selectVariant(VARIANTS.find(variant => variant.id === id)),
  snapshot: () => ({
    selected,
    currentTime: video.currentTime,
    duration: video.duration,
    paused: video.paused,
    readyState: video.readyState,
  }),
});

selectVariant(selected);

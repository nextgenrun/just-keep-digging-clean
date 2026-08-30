import { AUDIO_SANDBOX_CONFIG } from "./audioSandboxConfig.mjs";
import { AudioSandboxEngine } from "./audioSandboxEngine.js";
import { AudioSandboxSimulation } from "./audioSandboxSimulation.js";

const body = document.body;
const startOverlay = document.querySelector("#start-overlay");
const startButton = document.querySelector("#start-audio");
const statusLabel = document.querySelector("#audio-status");
const loadLabel = document.querySelector("#load-status");
const eventLabel = document.querySelector("#last-event");
const eventLog = document.querySelector("#event-log");
const ambienceToggle = document.querySelector("#ambience-toggle");
const laneSummary = document.querySelector("#lane-summary");
const busSliders = [...document.querySelectorAll("[data-bus]")];
let lane = AUDIO_SANDBOX_CONFIG.defaultLane;
let readyPromise = null;
let simulation;
let demoTimers = [];
let digIndex = 0;

function log(message, kind = "system") {
  const time = new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
  const item = document.createElement("li");
  item.innerHTML = `<time>${time}</time><span>${message}</span>`;
  item.dataset.kind = kind;
  eventLog.prepend(item);
  while (eventLog.children.length > 9) eventLog.lastElementChild.remove();
  eventLabel.textContent = message;
  body.dataset.lastEvent = message;
}

const audio = new AudioSandboxEngine(AUDIO_SANDBOX_CONFIG, (event) => {
  body.dataset.audioState = event.snapshot.state;
  body.dataset.loadedCount = String(event.snapshot.loaded);
  body.dataset.activeVoices = String(event.snapshot.activeVoices);
  body.dataset.activeLoops = event.snapshot.loops.join(",") || "none";
  if (event.snapshot.lastPlayed) {
    body.dataset.lastSound = event.snapshot.lastPlayed.id;
    body.dataset.lastRate = String(event.snapshot.lastPlayed.rate);
  }
  statusLabel.textContent = event.snapshot.state === "running" ? "Audio running" : event.snapshot.state;
  loadLabel.textContent = `${event.snapshot.loaded}/${event.snapshot.total} clips`;
  if (event.type === "ready") log("Current runtime and candidate clips decoded", "ready");
});

async function ensureAudio() {
  if (!readyPromise) {
    startButton.disabled = true;
    startButton.textContent = "Loading comparison…";
    statusLabel.textContent = "Unlocking audio";
    readyPromise = audio.unlockAndLoad().then((snapshot) => {
      busSliders.forEach((slider) => audio.setBusLevel(slider.dataset.bus, slider.value));
      startOverlay.hidden = true;
      startButton.disabled = false;
      startButton.textContent = "Audio ready";
      body.classList.add("audio-ready");
      if (ambienceToggle.checked) startAmbience();
      log("A/B sandbox ready", "ready");
      return snapshot;
    }).catch((error) => {
      readyPromise = null;
      startButton.disabled = false;
      startButton.textContent = "Retry audio";
      statusLabel.textContent = "Load failed";
      log(error.message, "error");
      throw error;
    });
  }
  return readyPromise;
}

function clearDemoTimers() {
  demoTimers.forEach(clearTimeout);
  demoTimers = [];
}

function later(callback, delay) {
  demoTimers.push(setTimeout(callback, delay));
}

function currentMaterial(material) {
  return AUDIO_SANDBOX_CONFIG.materialProfiles[material] || AUDIO_SANDBOX_CONFIG.materialProfiles.stone;
}

function playCandidateDig(material, breaks) {
  const hit = { dirt: "candidateDirtHit", stone: "candidateStoneHit", gold: "candidateGoldHit" }[material];
  const breaking = { dirt: "candidateDirtBreak", stone: "candidateStoneBreak", gold: "candidateGoldBreak" }[material];
  audio.play(breaks ? breaking : hit, { rate: 1 });
  if (material === "stone" && !breaks) audio.play("candidateToolContact", { delayMs: 12, rate: 1 });
  if (breaks) audio.play("candidateResource", { delayMs: 540, rate: 1 });
}

function performAudioAction(action, detail = {}) {
  if (action === "blocked") {
    audio.play(lane === "current" ? "liveTileHit" : "candidateStoneHit", { rate: lane === "current" ? 1 : 1 });
    return;
  }
  if (action === "dig") {
    if (lane === "current") {
      const profile = currentMaterial(detail.material);
      audio.play(digIndex++ % 2 ? "liveDigA" : "liveDigB", { rate: profile.digRate });
      if (detail.breaks) audio.play("liveTileBreak", { rate: profile.breakRate, gainDb: 20 * Math.log10(profile.breakVolume) });
    } else {
      playCandidateDig(detail.material, detail.breaks);
    }
    return;
  }
  if (action === "footstep") {
    const liveFeet = ["liveFootA", "liveFootB", "liveFootC"];
    const candidateFeet = ["candidateFootA", "candidateFootB"];
    const pool = lane === "current" ? liveFeet : candidateFeet;
    audio.play(pool[(detail.index || 0) % pool.length], { pan: detail.pan || 0, rate: 1 });
    return;
  }
  if (action === "flight-start") {
    if (lane === "current") return;
    audio.play("candidateAirStart", { rate: 1 });
    audio.startLoop("candidateFlightAir", "flight", { rate: 1 });
    return;
  }
  if (action === "flight-stop") {
    audio.stopLoop("flight");
    return;
  }
  if (action === "landing" && lane === "candidate") {
    audio.play("candidateLandingBody", { rate: 1 });
    audio.play("candidateLandingDebris", { delayMs: 35, rate: 1 });
  }
}

const audioActions = {
  action(action, detail = {}) {
    ensureAudio().then(() => performAudioAction(action, detail)).catch(() => {});
  }
};

function startAmbience() {
  if (lane === "current") {
    log("Current runtime has no continuous cave-bed SFX route", "audit");
    return;
  }
  audio.startLoop("candidateCaveBed", "cave-bed", { rate: 1 });
  audio.startLoop("candidateCaveWind", "cave-wind", { rate: 1 });
  log("Candidate cave ambience on", "ambience");
}

function stopAmbience() {
  audio.stopLoop("cave-bed");
  audio.stopLoop("cave-wind");
  log("Cave ambience off", "ambience");
}

function setLane(nextLane) {
  lane = nextLane === "current" ? "current" : "candidate";
  clearDemoTimers();
  audio.stopAll();
  body.dataset.sourceLane = lane;
  laneSummary.textContent = lane === "current"
    ? "Current runtime · live files + live material pitch rates"
    : "Sonniss candidate · recorded pitch + proposed missing slots";
  if (lane === "candidate" && ambienceToggle.checked) startAmbience();
  log(lane === "current" ? "Listening to current runtime routing" : "Listening to Sonniss candidates", "lane");
}

async function runAction(action) {
  await ensureAudio();
  if (action === "mining-demo") {
    log(`${lane === "current" ? "Current" : "Candidate"} mining cadence · dirt, stone, gold`, "mining");
    performAudioAction("dig", { material: "dirt", breaks: false });
    later(() => performAudioAction("dig", { material: "dirt", breaks: true }), 850);
    later(() => performAudioAction("dig", { material: "stone", breaks: false }), 1900);
    later(() => performAudioAction("dig", { material: "stone", breaks: true }), 2900);
    later(() => performAudioAction("dig", { material: "gold", breaks: false }), 4100);
    later(() => performAudioAction("dig", { material: "gold", breaks: true }), 5100);
    return;
  }
  if (action === "footstep-demo") {
    log(`${lane === "current" ? "Current" : "Candidate"} footsteps · runtime 900 ms cadence`, "movement");
    for (let index = 0; index < 5; index += 1) later(() => performAudioAction("footstep", { index, pan: index % 2 ? 0.18 : -0.18 }), index * 900);
    return;
  }
  if (action === "flight-demo") {
    if (lane === "current") log("Current runtime Flight is silent: no Flight SFX callsite", "audit");
    else log("Candidate Flight slot · restrained air only", "movement");
    simulation.startFlight();
    later(() => simulation.stopFlight(), 2800);
    return;
  }
  if (action === "ui-flow") {
    log(`${lane === "current" ? "Current" : "Candidate"} UI, XP and level-up flow`, "ui");
    if (lane === "current") {
      audio.play("liveUiSelect", { rate: 1.08 });
      audio.play("liveUiConfirm", { delayMs: 520, rate: 1 });
      audio.play("liveUiSelect", { delayMs: 1100, rate: 1.08 });
      audio.play("liveUiSelect", { delayMs: 1320, rate: 1.17 });
      audio.play("liveUiConfirm", { delayMs: 1900, rate: 0.92 });
      audio.play("liveUiConfirm", { delayMs: 2015, rate: 1.18 });
    } else {
      audio.play("candidateUiSelect", { rate: 1 });
      audio.play("candidateUiConfirm", { delayMs: 480, rate: 1 });
      audio.play("candidateRewardItem", { delayMs: 1150, rate: 1 });
      audio.play("candidateRewardCoins", { delayMs: 1280, rate: 1 });
      audio.play("candidateUiConfirm", { delayMs: 1760, rate: 1 });
    }
    return;
  }
  if (action === "seismic") {
    log(`${lane === "current" ? "Current approved" : "Candidate layered"} earthquake warning`, "hazard");
    if (lane === "current") audio.play("liveSeismicA", { rate: 1 });
    else {
      audio.play("candidateChain", { rate: 1 });
      audio.play("candidatePressure", { delayMs: 650, rate: 1 });
      audio.play("candidateCollapse", { delayMs: 1300, rate: 1 });
    }
    return;
  }
  if (action === "hardcore") {
    log(`${lane === "current" ? "Current" : "Candidate"} critical-pressure warning`, "hazard");
    if (lane === "current") audio.play("liveHardcore", { rate: 0.88 });
    else {
      audio.play("candidateCreak", { rate: 1 });
      audio.play("candidateTorch", { delayMs: 350, rate: 1 });
    }
    return;
  }
  if (action === "blocked") {
    performAudioAction("blocked");
    return log(`${lane === "current" ? "Current" : "Candidate"} blocked-tile feedback`, "mining");
  }
  if (action === "stop") {
    clearDemoTimers();
    audio.stopAll();
    return log("All test sounds stopped", "system");
  }
}

startButton.addEventListener("click", ensureAudio);
document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => runAction(button.dataset.action)));
document.querySelectorAll("[data-material]").forEach((button) => button.addEventListener("click", async () => {
  await ensureAudio();
  simulation.selectMaterial(button.dataset.material);
  simulation.digSelected();
}));
document.querySelectorAll("[name='source-lane']").forEach((radio) => radio.addEventListener("change", () => setLane(radio.value)));
busSliders.forEach((slider) => {
  const output = document.querySelector(`[data-level-for="${slider.dataset.bus}"]`);
  slider.addEventListener("input", () => {
    audio.setBusLevel(slider.dataset.bus, slider.value);
    output.textContent = `${slider.value}%`;
  });
});
ambienceToggle.addEventListener("change", async () => {
  await ensureAudio();
  if (ambienceToggle.checked) startAmbience(); else stopAmbience();
});
window.addEventListener("keydown", () => ensureAudio(), { once: true });

simulation = new AudioSandboxSimulation(document.querySelector("#simulation"), audioActions, log);
window.__audioSandbox = { config: AUDIO_SANDBOX_CONFIG, audio, simulation, start: ensureAudio, trigger: runAction, setLane, snapshot: () => ({ lane, audio: audio.snapshot(), simulation: simulation.snapshot(), lastEvent: body.dataset.lastEvent }) };
body.dataset.runtimeWiring = "none";
body.dataset.sourceLane = lane;
body.dataset.activeVoices = "0";
body.dataset.activeLoops = "none";
loadLabel.textContent = `0/${Object.keys(AUDIO_SANDBOX_CONFIG.sounds).length} clips`;
laneSummary.textContent = "Sonniss candidate · recorded pitch + proposed missing slots";
log("Runtime-audited A/B sandbox loaded · click Start audio", "system");

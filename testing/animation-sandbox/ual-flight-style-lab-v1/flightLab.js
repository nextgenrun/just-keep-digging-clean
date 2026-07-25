import {
  UAL_FLIGHT_LAB_VARIANTS,
  UAL_FLIGHT_STYLE_LAB_CONFIG,
} from "../../../values/ualFlightStyleLab.js";
import { loadFlightCharacterPack } from "./flightAssets.js";
import { FlightInput } from "./flightInput.js";
import { FlightRenderer } from "./flightRenderer.js";
import { FlightTimeline } from "./flightTimeline.js";
import { createFlightLabUi, createInitialState } from "./flightUi.js";

const config = UAL_FLIGHT_STYLE_LAB_CONFIG;
const state = createInitialState(config);
const canvas = document.getElementById("flight-stage");
const renderer = new FlightRenderer(canvas, config);
const timeline = new FlightTimeline(config);
const input = new FlightInput();
let activePack = null;
let loadToken = 0;
let lastTimestamp = performance.now();
let lastReadoutMs = -Infinity;
let latestSnapshot = null;

timeline.setPhase(state.phaseId);

const ui = createFlightLabUi(config, state, {
  onVariantChange: () => timeline.restart(),
  onPhaseChange: phaseId => timeline.setPhase(phaseId),
  onCharacterChange: characterId => loadCharacter(characterId),
  onPlayToggle: () => {
    timeline.playing = !timeline.playing;
    ui.setPlayback(timeline.playing);
  },
  onRestart: () => timeline.restart(),
  onStep: () => {
    timeline.step();
    ui.setPlayback(false);
  },
  onReset: () => timeline.restart(),
});

ui.setPlayback(timeline.playing);

window.__UAL_FLIGHT_STYLE_LAB_V1__ = {
  ready: false,
  error: null,
  productionChanged: false,
  version: config.version,
  getSnapshot: () => latestSnapshot,
};

async function loadCharacter(characterId) {
  const token = ++loadToken;
  ui.setStatus(`Loading ${config.characters[characterId]} flight sheets…`);
  try {
    const pack = await loadFlightCharacterPack(characterId);
    if (token !== loadToken) return;
    activePack = pack;
    timeline.restart();
    ui.setStatus(`${config.characters[characterId]} ready · configured flight sources · review only.`);
    window.__UAL_FLIGHT_STYLE_LAB_V1__.ready = true;
    window.__UAL_FLIGHT_STYLE_LAB_V1__.error = null;
  } catch (error) {
    if (token !== loadToken) return;
    console.error(error);
    ui.setStatus(error.message, true);
    window.__UAL_FLIGHT_STYLE_LAB_V1__.error = error.message;
  }
}

function currentVariant() {
  return UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === state.variantId)
    || UAL_FLIGHT_LAB_VARIANTS[0];
}

function animate(timestamp) {
  const deltaMs = Math.max(0, timestamp - lastTimestamp);
  lastTimestamp = timestamp;
  input.update(deltaMs);
  timeline.update(deltaMs, state.controls.playbackRate);

  if (activePack) {
    const inputState = input.snapshot();
    const variant = currentVariant();
    const sample = timeline.sample(variant, activePack, inputState.boostHeld);
    const metrics = renderer.render(
      activePack,
      sample,
      variant,
      state.controls,
      inputState,
      timeline.elapsedMs,
    );
    latestSnapshot = {
      ready: true,
      variant: variant.id,
      character: state.characterId,
      phaseMode: state.phaseId,
      phase: sample.phase,
      sourceAction: metrics.actionId,
      sourceFrame: metrics.frameIndex,
      boardOpacity: Number(metrics.boardOpacity.toFixed(3)),
      controls: { ...state.controls },
      collider: metrics.collider,
      productionChanged: false,
    };
    if ((timestamp - lastReadoutMs) > 90) {
      ui.setReadout(sample, metrics, variant);
      lastReadoutMs = timestamp;
    }
  }
  requestAnimationFrame(animate);
}

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat || ["INPUT", "SELECT", "BUTTON"].includes(event.target.tagName)) return;
  timeline.playing = !timeline.playing;
  ui.setPlayback(timeline.playing);
});

loadCharacter(state.characterId);
requestAnimationFrame(animate);

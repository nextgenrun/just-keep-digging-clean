import { UAL_FLIGHT_LAB_VARIANTS } from "../../../values/ualFlightStyleLab.js";

const query = new URLSearchParams(window.location.search);
const variantIds = new Set(UAL_FLIGHT_LAB_VARIANTS.map(variant => variant.id));

function queryNumber(name, rule) {
  if (!query.has(name)) return rule.default;
  const parsed = Number(query.get(name));
  return Number.isFinite(parsed) && parsed >= rule.min && parsed <= rule.max ? parsed : rule.default;
}

export function createInitialState(config) {
  const characterId = Object.hasOwn(config.characters, query.get("character"))
    ? query.get("character")
    : config.defaultCharacterId;
  const phaseIds = new Set(config.phases.map(phase => phase.id));
  const phaseId = phaseIds.has(query.get("phase")) ? query.get("phase") : config.defaultPhaseId;
  return {
    variantId: variantIds.has(query.get("variant")) ? query.get("variant") : config.defaultVariantId,
    characterId,
    phaseId,
    controls: {
      speed: queryNumber("speed", config.controls.speed),
      pitch: queryNumber("pitch", config.controls.pitch),
      boardY: queryNumber("boardY", config.controls.boardY),
      boardScale: queryNumber("boardScale", config.controls.boardScale),
      trailScale: queryNumber("trail", config.controls.trailScale),
      effectScale: queryNumber("effects", config.controls.effectScale),
      playbackRate: queryNumber("playback", config.controls.playbackRate),
      viewScale: query.get("view") === "game" ? "game" : "detail",
      faceLeft: query.get("left") === "1",
      showCollider: query.get("guides") !== "0",
    },
  };
}

function serializeState(config, state) {
  const params = new URLSearchParams();
  params.set("variant", state.variantId);
  params.set("character", state.characterId);
  params.set("phase", state.phaseId);
  params.set("view", state.controls.viewScale);
  params.set("speed", state.controls.speed);
  params.set("pitch", state.controls.pitch);
  params.set("boardY", state.controls.boardY);
  params.set("boardScale", state.controls.boardScale);
  params.set("trail", state.controls.trailScale);
  params.set("effects", state.controls.effectScale);
  params.set("playback", state.controls.playbackRate);
  if (state.controls.faceLeft) params.set("left", "1");
  if (!state.controls.showCollider) params.set("guides", "0");
  return params;
}

function setRange(input, output, rule, value, formatter) {
  input.min = rule.min;
  input.max = rule.max;
  input.step = rule.step;
  input.value = value;
  output.value = formatter(value);
}

export function createFlightLabUi(config, state, handlers) {
  const variantRoot = document.getElementById("variant-buttons");
  const phaseRoot = document.getElementById("phase-buttons");
  const characterSelect = document.getElementById("character-select");
  const playToggle = document.getElementById("play-toggle");
  const loadStatus = document.getElementById("load-status");
  const phaseReadout = document.getElementById("phase-readout");
  const sourceReadout = document.getElementById("source-readout");

  const syncUrl = () => {
    const params = serializeState(config, state);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  };

  UAL_FLIGHT_LAB_VARIANTS.forEach((variant) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "variant-button";
    button.dataset.variant = variant.id;
    button.setAttribute("role", "listitem");
    button.innerHTML = `<span class="variant-id">OPTION ${variant.id} · ${variant.short}</span><span class="variant-name">${variant.name}</span><span class="variant-description">${variant.description}</span>`;
    button.addEventListener("click", () => {
      state.variantId = variant.id;
      refreshSelections();
      syncUrl();
      handlers.onVariantChange?.(variant.id);
    });
    variantRoot.appendChild(button);
  });

  config.phases.forEach((phase) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.phase = phase.id;
    button.textContent = phase.label;
    button.addEventListener("click", () => {
      state.phaseId = phase.id;
      refreshSelections();
      syncUrl();
      handlers.onPhaseChange?.(phase.id);
    });
    phaseRoot.appendChild(button);
  });

  Object.entries(config.characters).forEach(([id, label]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    characterSelect.appendChild(option);
  });
  characterSelect.value = state.characterId;
  characterSelect.addEventListener("change", () => {
    state.characterId = characterSelect.value;
    syncUrl();
    handlers.onCharacterChange?.(state.characterId);
  });

  const rangeDefinitions = [
    ["speed-control", "speed-output", "speed", "speed", value => `${value} px/s`],
    ["pitch-control", "pitch-output", "pitch", "pitch", value => `${value > 0 ? "+" : ""}${value}°`],
    ["board-y-control", "board-y-output", "boardY", "boardY", value => `${value > 0 ? "+" : ""}${value}px`],
    ["board-scale-control", "board-scale-output", "boardScale", "boardScale", value => `${Number(value).toFixed(2)}×`],
    ["trail-control", "trail-output", "trailScale", "trailScale", value => `${Number(value).toFixed(2)}×`],
    ["effect-control", "effect-output", "effectScale", "effectScale", value => `${Number(value).toFixed(2)}×`],
    ["playback-control", "playback-output", "playbackRate", "playbackRate", value => `${Number(value).toFixed(2)}×`],
  ];

  rangeDefinitions.forEach(([inputId, outputId, stateKey, ruleKey, formatter]) => {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    const rule = config.controls[ruleKey];
    setRange(input, output, rule, state.controls[stateKey], formatter);
    input.addEventListener("input", () => {
      state.controls[stateKey] = Number(input.value);
      output.value = formatter(state.controls[stateKey]);
      syncUrl();
      handlers.onControlChange?.(stateKey, state.controls[stateKey]);
    });
  });

  const viewScale = document.getElementById("view-scale");
  viewScale.value = state.controls.viewScale;
  viewScale.addEventListener("change", () => {
    state.controls.viewScale = viewScale.value;
    syncUrl();
  });

  const wireCheck = (id, key) => {
    const input = document.getElementById(id);
    input.checked = state.controls[key];
    input.addEventListener("change", () => {
      state.controls[key] = input.checked;
      syncUrl();
    });
  };
  wireCheck("face-left", "faceLeft");
  wireCheck("show-collider", "showCollider");

  playToggle.addEventListener("click", () => handlers.onPlayToggle?.());
  document.getElementById("restart").addEventListener("click", () => handlers.onRestart?.());
  document.getElementById("step-frame").addEventListener("click", () => handlers.onStep?.());
  document.getElementById("reset-preset").addEventListener("click", () => {
    Object.entries(config.controls).forEach(([key, rule]) => { state.controls[key] = rule.default; });
    state.controls.viewScale = "detail";
    refreshControls();
    syncUrl();
    handlers.onReset?.();
  });

  document.getElementById("copy-link").addEventListener("click", async () => {
    await navigator.clipboard.writeText(window.location.href);
    setStatus("Review link copied.");
  });
  document.getElementById("copy-json").addEventListener("click", async () => {
    const payload = {
      version: config.version,
      variant: state.variantId,
      character: state.characterId,
      phase: state.phaseId,
      controls: state.controls,
      productionChanged: false,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setStatus("Tuning JSON copied; still review-only.");
  });

  function refreshSelections() {
    variantRoot.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.variant === state.variantId));
    });
    phaseRoot.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.phase === state.phaseId));
    });
    const selected = UAL_FLIGHT_LAB_VARIANTS.find(variant => variant.id === state.variantId);
    document.getElementById("board-note").textContent = selected.boardMode === "off"
      ? "This option has no board; fit controls are preserved for comparison."
      : selected.boardMode === "hybrid"
        ? "The board fades out during boost and redeploys for braking."
        : "The board follows the projected feet markers frame by frame.";
  }

  function refreshControls() {
    rangeDefinitions.forEach(([inputId, outputId, stateKey, ruleKey, formatter]) => {
      setRange(
        document.getElementById(inputId),
        document.getElementById(outputId),
        config.controls[ruleKey],
        state.controls[stateKey],
        formatter,
      );
    });
    viewScale.value = state.controls.viewScale;
  }

  function setPlayback(playing) { playToggle.textContent = playing ? "Pause" : "Play"; }
  function setStatus(message, isError = false) {
    loadStatus.textContent = message;
    loadStatus.style.color = isError ? "#ff9d9d" : "";
  }
  function setReadout(sample, metrics, variant) {
    phaseReadout.textContent = `Option ${variant.id} · ${variant.name} · ${sample.phase.toUpperCase()} · ${Math.round(metrics.effectiveSpeed)} px/s`;
    sourceReadout.textContent = `${sample.action.source_clip || sample.action.id} · frame ${metrics.frameIndex + 1}/${metrics.frameCount} · ${metrics.pitchDeg.toFixed(1)}°`;
  }

  refreshSelections();
  syncUrl();
  return { setPlayback, setStatus, setReadout, refreshSelections, refreshControls };
}

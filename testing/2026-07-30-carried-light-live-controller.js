import { createCarriedLightLiveRuntime } from
  "./2026-07-30-carried-light-live-runtime.js?v=20260815-normal-map-lighting-v1";

export function startCarriedLightLiveComparison(CONFIG) {
  const status = document.getElementById("status");
  const buttons = [...document.querySelectorAll("button[data-action]")];
  const entries = CONFIG.scenarios.map(scenario => {
    const panel = document.querySelector(`[data-id="${scenario.id}"]`);
    panel.querySelector("[data-label]").textContent = scenario.label;
    panel.querySelector("[data-detail]").textContent = scenario.detail;
    return {
      scenario,
      panel,
      frame: document.getElementById(`${scenario.id}-frame`),
      telemetry: panel.querySelector("[data-telemetry]"),
    };
  });
  const runtime = createCarriedLightLiveRuntime(entries, CONFIG);
  let telemetryTimer = null;

  document.getElementById("title").textContent = CONFIG.title;
  document.getElementById("subtitle").textContent = CONFIG.subtitle;
  document.getElementById("hint").textContent = CONFIG.copy.controls;
  status.textContent = CONFIG.copy.loading;

  function updatePressedControls(snapshot) {
    for (const button of buttons) {
      const action = button.dataset.action;
      const selected = action === "fuel"
        ? button.dataset.value === snapshot.fuelProfile
        : action === "weather"
          ? button.dataset.value === snapshot.weatherProfile
          : action === "day"
          ? button.dataset.value === snapshot.dayProfile
          : action === "depth"
            && button.dataset.value === snapshot.depthProfile;
      button.setAttribute("aria-pressed", String(selected));
    }
  }

  function updateTelemetry() {
    const live = runtime.snapshot();
    for (const entry of entries) {
      const data = live.scenarios.find(
        scenario => scenario?.scenario === entry.scenario.id
      );
      entry.telemetry.textContent = data
        ? `${Math.round(data.depth)}m · radius ${data.visibilityRadiusTiles.toFixed(2)}t · GP ${Math.round(data.gpRatio * 100)}% · layers ${data.authoredLayers}`
        : "Booting…";
      if (data?.presentationId) {
        entry.telemetry.append(` | ${data.presentationId}`);
      }
    }
    updatePressedControls(live);
  }

  function bindControls() {
    for (const button of buttons) {
      button.disabled = false;
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "step") runtime.step(Number(button.dataset.value));
        if (action === "resync") runtime.resync();
        if (action === "fuel") runtime.setFuel(button.dataset.value);
        if (action === "weather") runtime.setWeather(button.dataset.value);
        if (action === "day") runtime.setDayPhase(button.dataset.value);
        if (action === "depth") runtime.setDepth(button.dataset.value);
        if (action === "torch") runtime.toggleTorch();
        updateTelemetry();
      });
    }
    const forward = (event, type) => {
      if (!runtime.forwardInput(event, type)) return;
      event.preventDefault();
    };
    window.addEventListener("keydown", event => forward(event, "keydown"));
    window.addEventListener("keyup", event => forward(event, "keyup"));
  }

  const liveApi = {
    ready: false,
    snapshot: () => runtime.snapshot(),
    step: direction => runtime.step(direction),
    resync: () => runtime.resync(),
    setFuel: profile => runtime.setFuel(profile),
    setWeather: profile => runtime.setWeather(profile),
    setDayPhase: profile => runtime.setDayPhase(profile),
    setDepth: profile => runtime.setDepth(profile),
    setTorchActive: active => runtime.setTorchActive(active),
    toggleTorch: () => runtime.toggleTorch(),
  };
  window[CONFIG.apiGlobal] = liveApi;

  runtime.initialize(location.href).then(() => {
    bindControls();
    updateTelemetry();
    telemetryTimer = setInterval(
      updateTelemetry,
      CONFIG.timing.telemetryIntervalMs
    );
    liveApi.ready = true;
    status.textContent = CONFIG.copy.ready;
  }).catch(error => {
    console.error(`[${CONFIG.logLabel}]`, error);
    status.textContent = `${CONFIG.copy.failed}: ${error.message}`;
    status.style.color = "#ff8d86";
  });

  window.addEventListener("beforeunload", () => {
    if (telemetryTimer) clearInterval(telemetryTimer);
  });
  return liveApi;
}

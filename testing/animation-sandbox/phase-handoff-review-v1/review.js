const CONFIG_PATH = "../../../values/phaseHandoffReview.json";
const METRICS_PATH = "generated/phase-handoff-metrics.json";

const elements = {
  buttons: document.getElementById("scenario-buttons"),
  preview: document.getElementById("preview"),
  replay: document.getElementById("replay"),
  label: document.getElementById("scenario-label"),
  summary: document.getElementById("scenario-summary"),
  currentDelta: document.getElementById("current-delta"),
  proposedDelta: document.getElementById("proposed-delta"),
  inputDelay: document.getElementById("input-delay"),
  timing: document.getElementById("timing"),
};

const [config, metrics] = await Promise.all([
  fetch(CONFIG_PATH).then(response => response.json()),
  fetch(METRICS_PATH).then(response => response.json()),
]);

let activeScenarioId = config.defaultScenarioId;

function scenarioMetric(id) {
  const record = metrics.scenarios[id];
  if (id === "moving-dig") {
    return {
      current: Math.max(record.entry.currentFootDeltaLivePx, record.release.currentFootDeltaLivePx),
      proposed: Math.max(record.entry.proposedFootDeltaLivePx, record.release.proposedFootDeltaLivePx),
      delay: record.inputDelayFrames,
      timing: `Contact frame ${record.contactFrame} / ${record.actionFrames}`,
    };
  }
  return {
    current: record.currentFootDeltaLivePx,
    proposed: record.proposedFootDeltaLivePx,
    delay: record.inputDelayFrames,
    timing: `${record.pivotFrames} visual frames`,
  };
}

function selectScenario(id, replay = false) {
  const scenario = config.scenarios.find(value => value.id === id);
  if (!scenario) return;
  activeScenarioId = id;
  const measured = scenarioMetric(id);
  const suffix = replay ? `?replay=${Date.now()}` : "";
  elements.preview.src = `${scenario.output}${suffix}`;
  elements.label.textContent = scenario.label;
  elements.summary.textContent = scenario.summary;
  elements.currentDelta.textContent = `${measured.current.toFixed(1)} px`;
  elements.proposedDelta.textContent = `${measured.proposed.toFixed(1)} px`;
  elements.inputDelay.textContent = `${measured.delay} frames`;
  elements.timing.textContent = measured.timing;
  elements.buttons.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === id));
  });
}

config.scenarios.forEach((scenario) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.scenario = scenario.id;
  button.textContent = scenario.label;
  button.addEventListener("click", () => selectScenario(scenario.id, true));
  elements.buttons.appendChild(button);
});

elements.replay.addEventListener("click", () => selectScenario(activeScenarioId, true));
selectScenario(activeScenarioId);

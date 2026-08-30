export function configureAboveGroundFidelityGateHud(scene, config) {
  const sourceButton = document.querySelector("#source-view");
  const runtimeButton = document.querySelector("#runtime-view");
  const weather = document.querySelector("#weather-select");
  const motion = document.querySelector("#motion-toggle");
  config.weatherPresets.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    weather.append(option);
  });
  weather.value = config.initialWeatherId;
  weather.disabled = !scene.runtimeEnabled;
  motion.disabled = !scene.runtimeEnabled;
  weather.addEventListener("change", () => scene.setWeather(weather.value));
  motion.addEventListener("click", () => scene.toggleMotion());
  sourceButton.addEventListener("click", () => scene.setView(config.comparison.sourceValue));
  runtimeButton.addEventListener("click", () => scene.setView(config.comparison.runtimeValue));
  sourceButton.setAttribute("aria-pressed", String(!scene.runtimeEnabled));
  runtimeButton.setAttribute("aria-pressed", String(scene.runtimeEnabled));
}

export function refreshAboveGroundFidelityGateHud(scene, snapshot) {
  const mode = document.querySelector("#mode-label");
  const status = document.querySelector("#runtime-status");
  const detail = document.querySelector("#runtime-detail");
  const motion = document.querySelector("#motion-toggle");
  mode.textContent = snapshot.view === scene.configReview.comparison.sourceValue
    ? "UNCHANGED SOURCE PLATE"
    : "REAL RUNTIME COMPOSITE";
  status.textContent = snapshot.ready
    ? "One intact generated background owner"
    : "Loading the checked-in source plate…";
  detail.textContent = snapshot.view === scene.configReview.comparison.sourceValue
    ? `${snapshot.plateSourceWidth}×${snapshot.plateSourceHeight} source · no runtime overlays`
    : `${snapshot.heroLandmarks} grounded hero · ${snapshot.decorativePropCount} decorative props · ${snapshot.repeatedSkyCards} repeated sky cards`;
  motion.textContent = snapshot.motionEnabled ? "Pause motion" : "Resume motion";
}

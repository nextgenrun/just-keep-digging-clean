export function configureAboveGroundLivingHud(scene, review, livingReview) {
  const chapterSelect = document.querySelector("#chapter-select");
  const bandSelect = document.querySelector("#band-select");
  const weatherSelect = document.querySelector("#weather-select");
  for (const chapter of review.chapters) {
    chapterSelect.add(new Option(chapter.label, chapter.id));
  }
  for (const band of review.bands) bandSelect.add(new Option(band.label, band.id));
  for (const weather of livingReview.weatherPresets) {
    weatherSelect.add(new Option(weather.label, weather.id));
  }

  chapterSelect.addEventListener("change", event => scene.jumpToChapter(event.target.value));
  bandSelect.addEventListener("change", event => scene.jumpToBand(event.target.value));
  weatherSelect.addEventListener("change", event => scene.setWeather(event.target.value));
  document.querySelector("#previous").addEventListener("click", () => scene.stepChapter(-1));
  document.querySelector("#next").addEventListener("click", () => scene.stepChapter(1));
  document.querySelector("#motion-toggle").addEventListener("click", () => scene.toggleMotion());

  globalThis.__ABOVE_GROUND_LIVING_RUNTIME__ = Object.freeze({
    jumpToChapter: id => scene.jumpToChapter(id),
    jumpToBand: id => scene.jumpToBand(id),
    jumpTo: (chapterId, bandId) => scene.jumpTo(chapterId, bandId),
    setWeather: id => scene.setWeather(id),
    setMotion: enabled => scene.setMotion(enabled),
    snapshot: () => scene.snapshot(),
  });
}

export function refreshAboveGroundLivingHud(scene, snapshot) {
  const chapter = scene.currentChapter();
  const band = scene.currentBand();
  document.querySelector("#chapter-label").textContent = `${chapter.label} · ${band.label}`;
  document.querySelector("#chapter-select").value = chapter.id;
  document.querySelector("#band-select").value = band.id;
  document.querySelector("#weather-select").value = snapshot.weather.kind;
  document.querySelector("#motion-toggle").textContent = scene.motionEnabled
    ? "Pause motion" : "Resume motion";
  document.querySelector("#runtime-status").textContent = snapshot.ready
    ? `${snapshot.renderer} · ${snapshot.fps.toFixed(0)} fps · ${snapshot.activePropCount} active props`
    : "Streaming the current camera window…";
  document.querySelector("#motion-status").textContent = (
    `${snapshot.weather.kind} ${Math.round(snapshot.weather.intensity * 100)}% · `
    + `${snapshot.clock.phase} ${snapshot.clock.time} · `
    + `${snapshot.excludedFloatingLibraryCandidates} floating library candidates excluded`
  );
}

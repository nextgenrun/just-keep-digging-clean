const element = id => document.querySelector(`#${id}`);

export class GroundLevelHud {
  constructor(review, handlers) {
    this.review = review;
    this.handlers = handlers;
    this.elements = {
      chapterName: element("chapter-name"),
      chapterPlan: element("chapter-plan"),
      chapterSelect: element("chapter-select"),
      chapterStrip: element("chapter-strip"),
      propBadge: element("prop-badge"),
      motion: element("motion"),
      motionValue: element("motion-value"),
      day: element("day"),
      hour: element("hour"),
      weather: element("weather"),
      pause: element("pause"),
      clock: element("clock"),
      legacyProps: element("legacy-props"),
      legacyStructures: element("legacy-structures"),
      cloudCount: element("cloud-count"),
      backgroundMotion: element("background-motion"),
      renderer: element("renderer"),
    };
    this.populateChapters();
    this.bind();
  }

  populateChapters() {
    for (const [index, chapter] of this.review.chapters.entries()) {
      const option = document.createElement("option");
      option.value = chapter.id;
      option.textContent = `${String(index + 1).padStart(2, "0")} · ${chapter.label}`;
      this.elements.chapterSelect.append(option);
      const dot = document.createElement("span");
      dot.className = "chapter-dot";
      dot.dataset.chapterId = chapter.id;
      this.elements.chapterStrip.append(dot);
    }
  }

  bind() {
    element("previous").addEventListener("click", () => this.handlers.stepChapter(-1));
    element("next").addEventListener("click", () => this.handlers.stepChapter(1));
    this.elements.chapterSelect.addEventListener("change", event => this.handlers.jumpChapter(event.target.value));
    this.elements.motion.addEventListener("input", event => {
      this.elements.motionValue.textContent = `${event.target.value}%`;
      this.handlers.setMotion(event.target.value);
    });
    this.elements.day.addEventListener("change", event => this.handlers.setDay(event.target.value));
    this.elements.hour.addEventListener("change", event => this.handlers.setHour(event.target.value));
    this.elements.weather.addEventListener("change", event => this.handlers.setWeather(event.target.value));
    this.elements.pause.addEventListener("click", () => {
      const paused = this.handlers.togglePause();
      this.elements.pause.textContent = paused ? "Resume world clock" : "Pause world clock";
    });
  }

  setChapter(chapter) {
    this.elements.chapterName.textContent = chapter.label;
    this.elements.chapterPlan.textContent = `${chapter.anchor} · ${chapter.supports}`;
    this.elements.chapterSelect.value = chapter.id;
    this.elements.chapterStrip.querySelectorAll(".chapter-dot").forEach(dot => {
      dot.classList.toggle("active", dot.dataset.chapterId === chapter.id);
    });
  }

  setInitialState(initial) {
    this.elements.motion.value = String(initial.motionPercent);
    this.elements.motionValue.textContent = `${initial.motionPercent}%`;
    this.elements.day.value = String(initial.day);
    this.elements.hour.value = String(Math.floor(initial.hour));
    this.elements.weather.value = initial.weather;
  }

  update(snapshot) {
    this.elements.propBadge.textContent = snapshot.background.renderMode === "approved-reference-static"
      ? "static approved panel · awaiting layer pack"
      : "background-only runtime · 0 overlays";
    this.elements.legacyProps.textContent = String(snapshot.legacyPropOverlays);
    this.elements.legacyStructures.textContent = String(snapshot.legacyStructureOverlays);
    this.elements.cloudCount.textContent = String(snapshot.background.atmosphere.cloudSegments);
    this.elements.backgroundMotion.textContent = `${snapshot.background.segmentationStatus} · ${snapshot.background.motionSystems} targets · mountains ${snapshot.background.mountainDisplacementPx}px`;
    this.elements.renderer.textContent = `${snapshot.renderer} · ${snapshot.fps} fps`;
    const chronology = snapshot.chronology;
    this.elements.clock.textContent = `D${chronology.day} · W${chronology.week} · M${chronology.month} · ${String(Math.floor(chronology.hour)).padStart(2, "0")}:00`;
  }
}

import { createInitialState, LAB_CONTROL_BOUNDS, LAB_SCENARIOS, scenarioById } from "./labConfig.js";

const $ = (selector) => document.querySelector(selector);

export class LabUi {
  constructor(state, assets, handlers) {
    this.state = state;
    this.assets = assets;
    this.handlers = handlers;
    this.elements = {
      tabs: $("#scenario-tabs"), play: $("#play"), restart: $("#restart"),
      stepBack: $("#step-back"), stepForward: $("#step-forward"),
      timeline: $("#timeline"), timeOutput: $("#time-output"),
      title: $("#scenario-title"), kicker: $("#scenario-kicker"),
      markerStatus: $("#marker-status"), library: $("#library-action"),
      exportPanel: $("#export-panel"), draftJson: $("#draft-json"),
      status: $("#load-status"),
    };
    this._buildTabs();
    this._buildLibrary();
    this._applyQuery();
    this._applyControlBounds();
    this._bindControls();
    this.syncControls();
  }

  _buildTabs() {
    this.elements.tabs.innerHTML = LAB_SCENARIOS.map((scenario) => `
      <button type="button" data-scenario="${scenario.id}">${scenario.label}</button>
    `).join("");
    this.elements.tabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-scenario]");
      if (!button) return;
      this.state.scenarioId = button.dataset.scenario;
      this._updateUrl();
      this.handlers.rebuild(false);
    });
  }

  _buildLibrary() {
    const actions = Object.entries(this.assets.manifest.actions);
    this.elements.library.innerHTML = actions.map(([id, action]) => `
      <option value="${id}">${id} · ${action.source_clip}</option>
    `).join("");
  }

  _applyQuery() {
    const query = new URLSearchParams(window.location.search);
    const scenario = query.get("scenario");
    const action = query.get("action");
    const aim = query.get("aim");
    if (LAB_SCENARIOS.some((entry) => entry.id === scenario)) this.state.scenarioId = scenario;
    if (this.assets.manifest.actions[action]) this.state.selectedActionId = action;
    if (aim) this.state.aim = aim;
  }

  _updateUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("scenario", this.state.scenarioId);
    url.searchParams.set("action", this.state.selectedActionId);
    url.searchParams.set("aim", this.state.aim);
    window.history.replaceState(null, "", url);
  }

  _applyControlBounds() {
    const apply = (id, bounds) => {
      const element = $(`#${id}`);
      element.min = String(bounds.minimum);
      element.max = String(bounds.maximum);
      element.step = String(bounds.step);
    };
    apply("speed", LAB_CONTROL_BOUNDS.speed);
    apply("stride", LAB_CONTROL_BOUNDS.stride);
    apply("cadence-min", LAB_CONTROL_BOUNDS.cadence);
    apply("cadence-max", LAB_CONTROL_BOUNDS.cadence);
    apply("run-enter", LAB_CONTROL_BOUNDS.runThreshold);
    apply("run-exit", LAB_CONTROL_BOUNDS.runThreshold);
    apply("flight-hover", LAB_CONTROL_BOUNDS.holdSeconds);
    apply("flight-travel", LAB_CONTROL_BOUNDS.holdSeconds);
    apply("combo-gap", LAB_CONTROL_BOUNDS.comboGapMs);
    apply("contact-offset", LAB_CONTROL_BOUNDS.contactFrameOffset);
    apply("contact-scale", LAB_CONTROL_BOUNDS.contactScale);
    $("#start-trim").min = String(LAB_CONTROL_BOUNDS.trim.minimum);
    $("#start-trim").step = String(LAB_CONTROL_BOUNDS.trim.step);
    $("#stop-trim").min = String(LAB_CONTROL_BOUNDS.trim.minimum);
    $("#stop-trim").step = String(LAB_CONTROL_BOUNDS.trim.step);
    $("#landing-frames").min = String(LAB_CONTROL_BOUNDS.landingFrames.minimum);
    $("#landing-frames").max = String(this.state.landingFrameMax);
    $("#landing-frames").step = String(LAB_CONTROL_BOUNDS.landingFrames.step);
    $("#playback-rate").innerHTML = LAB_CONTROL_BOUNDS.playbackRates.map((value) => `<option value="${value}">${value}×</option>`).join("");
    $("#zoom").innerHTML = LAB_CONTROL_BOUNDS.zoomLevels.map((value) => `<option value="${value}">${value}×${value === 1 ? " live" : ""}</option>`).join("");
    $("#cadence-mode").innerHTML = LAB_CONTROL_BOUNDS.cadenceModes.map((value) => `<option value="${value}">${value === "matched" ? "Game matched" : "Native 30 FPS"}</option>`).join("");
    $("#aim").innerHTML = LAB_CONTROL_BOUNDS.aims.map((value) => `<option value="${value}">${value}</option>`).join("");
  }

  _bindValue(id, property, parser = Number) {
    const element = $(`#${id}`);
    element.addEventListener("input", () => {
      this.state[property] = parser(element.value);
      this.handlers.rebuild(true);
    });
  }

  _bindToggle(id, property) {
    const element = $(`#${id}`);
    element.addEventListener("change", () => { this.state[property] = element.checked; });
  }

  _bindControls() {
    this.elements.play.addEventListener("click", this.handlers.play);
    this.elements.restart.addEventListener("click", this.handlers.restart);
    this.elements.stepBack.addEventListener("click", () => this.handlers.step(-1));
    this.elements.stepForward.addEventListener("click", () => this.handlers.step(1));
    this.elements.timeline.addEventListener("input", () => this.handlers.seek(Number(this.elements.timeline.value) / 1000));
    this._bindValue("playback-rate", "playbackRate");
    this._bindValue("cadence-mode", "cadenceMode", String);
    this._bindValue("speed", "speedPxPerSec");
    this._bindValue("stride", "strideTilesPerCycle");
    this._bindValue("cadence-min", "cadenceMin");
    this._bindValue("cadence-max", "cadenceMax");
    this._bindValue("start-trim", "startTrimFrames");
    this._bindValue("stop-trim", "stopTrimFrames");
    this._bindValue("run-enter", "runEnterSpeedPxPerSec");
    this._bindValue("run-exit", "runExitSpeedPxPerSec");
    this._bindValue("landing-frames", "landingFrameCount");
    this._bindValue("flight-hover", "flightHoverSeconds");
    this._bindValue("flight-travel", "flightTravelSeconds");
    this._bindValue("combo-gap", "comboGapMs");
    this._bindValue("contact-offset", "contactFrameOffset");
    this._bindValue("contact-scale", "contactScale");
    this._bindValue("zoom", "zoom");
    $("#facing").addEventListener("change", () => { this.state.facingLeft = $("#facing").value === "left"; });
    $("#aim").addEventListener("change", () => {
      this.state.aim = $("#aim").value;
      this._updateUrl();
      this.handlers.rebuild(false);
    });
    this.elements.library.addEventListener("change", () => {
      this.state.selectedActionId = this.elements.library.value;
      this._updateUrl();
      this.handlers.rebuild(false);
    });
    this._bindToggle("guides", "showGuides");
    this._bindToggle("collider", "showCollider");
    this._bindToggle("rig", "showRig");
    this._bindToggle("contact", "showContact");
    this._bindToggle("onion", "showOnion");
    $("#reset-draft").addEventListener("click", () => {
      const retained = {
        scenarioId: this.state.scenarioId, selectedActionId: this.state.selectedActionId, aim: this.state.aim,
        editorDraft: this.state.editorDraft, editorOriginalBody: this.state.editorOriginalBody,
        editorTool: this.state.editorTool, editorScope: this.state.editorScope,
        selectedMarker: this.state.selectedMarker, snapToPixels: this.state.snapToPixels,
        showProductionGhost: this.state.showProductionGhost,
      };
      Object.assign(this.state, createInitialState(), retained);
      Object.assign(this.state, {
        bodyWidthPx: retained.editorDraft.body.widthPx,
        bodyHeightPx: retained.editorDraft.body.heightPx,
        bodyOffsetXPx: retained.editorDraft.body.offsetXPx,
        bodyOffsetYPx: retained.editorDraft.body.offsetYPx,
      });
      this.syncControls();
      this.handlers.editorDirty();
      this.handlers.rebuild(false);
    });
    $("#export-draft").addEventListener("click", this.handlers.exportDraft);
    $("#open-import").addEventListener("click", () => {
      this.elements.exportPanel.hidden = false;
      $("#import-json").focus();
    });
    $("#copy-json").addEventListener("click", async () => {
      await navigator.clipboard?.writeText(this.elements.draftJson.value);
      $("#copy-json").textContent = "Copied";
    });
    $("#clear-events").addEventListener("click", this.handlers.clearEvents);
  }

  syncControls() {
    $("#start-trim").max = String(this.state.startTrimMax);
    $("#stop-trim").max = String(this.state.stopTrimMax);
    const mappings = {
      "playback-rate": this.state.playbackRate, "cadence-mode": this.state.cadenceMode,
      speed: this.state.speedPxPerSec, stride: this.state.strideTilesPerCycle,
      "cadence-min": this.state.cadenceMin, "cadence-max": this.state.cadenceMax,
      "start-trim": this.state.startTrimFrames, "stop-trim": this.state.stopTrimFrames,
      "run-enter": this.state.runEnterSpeedPxPerSec, "run-exit": this.state.runExitSpeedPxPerSec,
      "landing-frames": this.state.landingFrameCount,
      "flight-hover": this.state.flightHoverSeconds, "flight-travel": this.state.flightTravelSeconds,
      "combo-gap": this.state.comboGapMs, "contact-offset": this.state.contactFrameOffset,
      "contact-scale": this.state.contactScale,
      zoom: this.state.zoom, facing: this.state.facingLeft ? "left" : "right",
      aim: this.state.aim, "library-action": this.state.selectedActionId,
    };
    Object.entries(mappings).forEach(([id, value]) => { const element = $(`#${id}`); if (element) element.value = String(value); });
    const toggles = { guides: "showGuides", collider: "showCollider", rig: "showRig", contact: "showContact", onion: "showOnion" };
    Object.entries(toggles).forEach(([id, property]) => { $(`#${id}`).checked = this.state[property]; });
  }

  update(snapshot, renderMeta) {
    const scenario = scenarioById(this.state.scenarioId);
    this.elements.title.textContent = scenario.title;
    this.elements.kicker.textContent = scenario.description;
    this.elements.play.textContent = this.state.playing ? "Pause" : "Play";
    this.elements.timeline.max = String(Math.round(snapshot.totalSeconds * 1000));
    this.elements.timeline.value = String(Math.round(snapshot.elapsedSeconds * 1000));
    this.elements.timeOutput.textContent = `${snapshot.elapsedSeconds.toFixed(2)} / ${snapshot.totalSeconds.toFixed(2)}s`;
    $("#speed-output").textContent = `${this.state.speedPxPerSec} px/s`;
    $("#stride-output").textContent = `${this.state.strideTilesPerCycle.toFixed(2)} tiles`;
    const markerRatio = `${renderMeta.markerFrameCount}/${renderMeta.markerExpectedFrames}`;
    this.elements.markerStatus.textContent = renderMeta.markerCoverage === "complete"
      ? `Rig markers complete · ${snapshot.segment.clip.actionId} · ${markerRatio}`
      : renderMeta.markerCoverage === "partial"
        ? `Rig markers partial · ${snapshot.segment.clip.actionId} · ${markerRatio} · frame ${renderMeta.markerFrameAvailable ? "available" : "missing"}`
        : `Marker data missing · ${snapshot.segment.clip.actionId} · ${markerRatio}`;
    this.elements.markerStatus.classList.toggle("missing", !renderMeta.markerFrameAvailable);
    this.elements.markerStatus.classList.toggle("partial", renderMeta.markerCoverage === "partial");
    this.elements.tabs.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.scenario === this.state.scenarioId));
    this.elements.status.textContent = `Ready · ${Object.keys(this.assets.manifest.actions).length} production actions · production unchanged`;
  }

  showExport(json) {
    this.elements.draftJson.value = json;
    this.elements.exportPanel.hidden = false;
    this.elements.exportPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}
